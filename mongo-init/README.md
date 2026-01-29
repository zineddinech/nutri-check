# MongoDB Initialization

## Scripts

### init-mongo.sh

Initialise la base de données lors du premier démarrage Docker. Charge les données, filtre les produits invalides, nettoie les champs (conserve uniquement les 15 essentiels) et crée les index.

### filter-mongo.sh

Nettoie une collection existante en supprimant tous les champs sauf les 15 essentiels, normalise les pays et crée les index de performance.

### report-mongo.py

Analyse le dump MongoDB et affiche les statistiques des données.
