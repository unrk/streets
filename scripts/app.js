// Données globales
let voiesData = [];

// Charger les données au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
    await initGlobalSearch();

    // Lance la rotation des libellés si présent sur la page
    if (document.querySelector('.rotatingName')) {
        rotateNames();
    }

    // Si on est sur la page d'arrondissement
    if (document.querySelector('.rues-list')) {
        await initArrondissementPage();
    }
});

// Initialiser la page d'arrondissement
async function initArrondissementPage() {
    // Récupérer le code postal depuis l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const codePostal = urlParams.get('code');

    if (!codePostal) {
        showError('Code postal manquant');
        return;
    }

    // Charger les données
    showLoading();
    try {
        await loadVoiesData();
        displayRues(codePostal);
    } catch (error) {
        showError('Erreur lors du chargement des données: ' + error.message);
    }
}

// Charger les données depuis voie.json
async function loadVoiesData() {
    try {
        const response = await fetch('datas/voie.json');
        if (!response.ok) {
            throw new Error('Erreur de chargement du fichier');
        }
        voiesData = await response.json();
    } catch (error) {
        throw new Error('Impossible de charger les données des voies');
    }
}

// Afficher les rues d'un arrondissement
function displayRues(codePostal) {
    const ruesList = document.querySelector('.rues-list');
    const title = document.querySelector('.header h1');
    const stats = document.querySelector('.stats');
    const searchInput = document.querySelector('#search');

    // Extraire le numéro d'arrondissement du code postal (750XX -> XX)
    const arrondissement = codePostal.substring(3);

    // Filtrer les voies par arrondissement en utilisant le champ arrtd
    let ruesFiltered;

    if (arrondissement === '00') {
        // Afficher toutes les rues de Paris
        ruesFiltered = voiesData.filter(voie => voie.arrtd !== null);
    } else {
        // Filtrer par arrondissement spécifique
        ruesFiltered = voiesData.filter(voie => {
            return voie.arrtd === arrondissement;
        });
    }

    // Mettre à jour le titre
    const arrondissementNames = {
        '00': 'Tous Arrondissements Confondus',
        '01': 'Louvre', '02': 'Bourse', '03': 'Temple',
        '04': 'Hôtel-de-Ville', '05': 'Panthéon', '06': 'Luxembourg',
        '07': 'Palais-Bourbon', '08': 'Élysée', '09': 'Opéra',
        '10': 'Entrepôt', '11': 'Popincourt', '12': 'Reuilly',
        '13': 'Gobelins', '14': 'Observatoire', '15': 'Vaugirard',
        '16': 'Passy', '17': 'Batignolles-Monceau', '18': 'Buttes-Montmartre',
        '19': 'Buttes-Chaumont', '20': 'Ménilmontant'
    };

    if (arrondissement === '00') {
        title.textContent = `Paris - ${arrondissementNames['00']}`;
    } else {
        const suffix = arrondissement === '01' ? 'er' : 'e';
        title.textContent = `${parseInt(arrondissement)}${suffix} Arrondissement - ${arrondissementNames[arrondissement]}`;
    }

    // Fonction pour afficher les rues
    const renderRues = (rues) => {
        ruesList.innerHTML = '';

        if (rues.length === 0) {
            ruesList.innerHTML = '<p class="error">Aucune voie trouvée</p>';
            return;
        }

        // Trier par nom
        rues.sort((a, b) => {
            const nameA = a.l_longmin || a.l_courtmin || a.l_voie || '';
            const nameB = b.l_longmin || b.l_courtmin || b.l_voie || '';
            return nameA.localeCompare(nameB);
        });

        // Afficher les statistiques
        stats.textContent = `${rues.length} voie${rues.length > 1 ? 's' : ''} trouvée${rues.length > 1 ? 's' : ''}`;

        // Créer les éléments
        rues.forEach(voie => {
            const rueItem = document.createElement('div');
            rueItem.className = 'rue-item';

            const rueName = document.createElement('div');
            rueName.className = 'rue-name';

            // Construire le nom complet de la rue
            let nomComplet = '';
            if (voie.l_longmin) {
                // Si on a le nom long complet, l'utiliser directement
                nomComplet = voie.l_longmin;
            } else if (voie.l_courtmin) {
                // Sinon utiliser le nom court
                nomComplet = voie.l_courtmin;
            } else {
                // Sinon construire avec le type + nom
                const types = {
                    'RUE': 'Rue', 'AV': 'Avenue', 'BD': 'Boulevard',
                    'PAS': 'Passage', 'IMP': 'Impasse', 'PL': 'Place',
                    'ALL': 'Allée', 'SQ': 'Square', 'COUR': 'Cour',
                    'CHE': 'Chemin', 'VOIE': 'Voie', 'CITE': 'Cité',
                    'VLA': 'Villa', 'PONT': 'Pont', 'QU': 'Quai'
                };
                const type = types[voie.c_desi] || voie.c_desi || '';
                const nom = voie.l_voie || '';
                const liaison = voie.c_liaison || '';

                if (type && nom) {
                    nomComplet = `${type} ${liaison} ${nom}`.replace(/\s+/g, ' ').trim();
                } else {
                    nomComplet = nom || 'Nom inconnu';
                }
            }

            rueName.textContent = nomComplet;
            rueItem.appendChild(rueName);
            ruesList.appendChild(rueItem);
        });
    };

    // Afficher initialement toutes les rues
    renderRues(ruesFiltered);

    // Recherche en temps réel
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = ruesFiltered.filter(voie => {
                const name = (voie.l_longmin || voie.l_courtmin || voie.l_voie || '').toLowerCase();
                return name.includes(searchTerm);
            });
            renderRues(filtered);
        });
    }
}

// Afficher le message de chargement
function showLoading() {
    const ruesList = document.querySelector('.rues-list');
    if (ruesList) {
        ruesList.innerHTML = '<div class="loading">Chargement...</div>';
    }
}

// Afficher un message d'erreur
function showError(message) {
    const ruesList = document.querySelector('.rues-list');
    if (ruesList) {
        ruesList.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Bouton retour
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

// Initialiser la recherche globale
async function initGlobalSearch() {
    const searchForm = document.querySelector('.search-bar form');
    const searchInput = document.querySelector('#street-search');
    const searchResults = document.querySelector('.search-results');
    const clearBtn = searchForm?.querySelector('.search-clear');

    if (!searchForm || !searchInput || !searchResults) return;

    // Charger les données si pas encore chargées
    if (voiesData.length === 0) {
        try {
            await loadVoiesData();
        } catch (error) {
            searchResults.innerHTML = '<div class="error">Erreur lors du chargement des données</div>';
            return;
        }
    }

    // Fonction pour formater le nom complet d'une rue
    const formatRueName = (voie) => {
        if (voie.l_longmin) {
            return voie.l_longmin;
        } else if (voie.l_courtmin) {
            return voie.l_courtmin;
        } else {
            const types = {
                'RUE': 'Rue', 'AV': 'Avenue', 'BD': 'Boulevard',
                'PAS': 'Passage', 'IMP': 'Impasse', 'PL': 'Place',
                'ALL': 'Allée', 'SQ': 'Square', 'COUR': 'Cour',
                'CHE': 'Chemin', 'VOIE': 'Voie', 'CITE': 'Cité',
                'VLA': 'Villa', 'PONT': 'Pont', 'QU': 'Quai'
            };
            const type = types[voie.c_desi] || voie.c_desi || '';
            const nom = voie.l_voie || '';
            const liaison = voie.c_liaison || '';

            if (type && nom) {
                return `${type} ${liaison} ${nom}`.replace(/\s+/g, ' ').trim();
            } else {
                return nom || 'Nom inconnu';
            }
        }
    };

    // Fonction pour rechercher les rues
    const searchStreets = (searchTerm) => {
        if (!searchTerm || searchTerm.trim() === '') {
            searchResults.innerHTML = '';
            return;
        }

        const term = searchTerm.toLowerCase().trim();

        // Filtrer les voies qui correspondent
        const matches = voiesData.filter(voie => {
            const name = (voie.l_longmin || voie.l_courtmin || voie.l_voie || '').toLowerCase();
            return name.includes(term);
        });

        // Limiter à 50 résultats pour les performances
        const limitedMatches = matches.slice(0, 50);

        // Afficher les résultats
        if (limitedMatches.length === 0) {
            searchResults.innerHTML = '<div class="no-results">Aucune rue trouvée</div>';
            return;
        }

        // Trier par nom
        limitedMatches.sort((a, b) => {
            const nameA = formatRueName(a);
            const nameB = formatRueName(b);
            return nameA.localeCompare(nameB);
        });

        // Créer le HTML des résultats
        let resultsHTML = `<div class="results-count">${matches.length} rue${matches.length > 1 ? 's' : ''} trouvée${matches.length > 1 ? 's' : ''}${matches.length > 50 ? ' (50 premiers résultats affichés)' : ''}</div>`;
        resultsHTML += '<div class="results-list">';

        limitedMatches.forEach(voie => {
            const rueName = formatRueName(voie);
            const arrondissement = voie.arrtd || '?';
            const suffix = arrondissement === '01' ? 'er' : 'e';
            const arrondissementNames = {
                '01': 'Louvre', '02': 'Bourse', '03': 'Temple',
                '04': 'Hôtel-de-Ville', '05': 'Panthéon', '06': 'Luxembourg',
                '07': 'Palais-Bourbon', '08': 'Élysée', '09': 'Opéra',
                '10': 'Entrepôt', '11': 'Popincourt', '12': 'Reuilly',
                '13': 'Gobelins', '14': 'Observatoire', '15': 'Vaugirard',
                '16': 'Passy', '17': 'Batignolles-Monceau', '18': 'Buttes-Montmartre',
                '19': 'Buttes-Chaumont', '20': 'Ménilmontant'
            };
            const arrName = arrondissementNames[arrondissement] || '';

            resultsHTML += `
                <div class="result-item">
                    <div class="result-name">${rueName}</div>
                    <div class="result-arrondissement">${parseInt(arrondissement)}${suffix} arr. ${arrName ? '- ' + arrName : ''}</div>
                </div>
            `;
        });

        resultsHTML += '</div>';
        searchResults.innerHTML = resultsHTML;
    };

    // Gérer la soumission du formulaire
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        searchStreets(searchInput.value);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            searchResults.innerHTML = '';
            searchInput.focus();
        });
    }

    // Recherche en temps réel
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchStreets(e.target.value);
        }, 300); // Délai de 300ms pour éviter trop de recherches
    });
}



function rotateNames() {
    const names = ["une place", "un boulevard", "une rue", "une avenue", "une allée", "une impasse"];
    let i = 0;
    const targets = document.querySelectorAll(".rotatingName");
    if (targets.length === 0) return;

    const applyText = () => {
        targets.forEach(t => {
            t.textContent = names[i];
        });
    };

    applyText();
    setInterval(() => {
        i = (i + 1) % names.length;
        applyText();
    }, 1500);
}
