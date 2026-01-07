# Synthèse — Recherche sur la génération de recettes avec l’IA

## 1. Problématique

Dans NutriCheck, nous souhaitons proposer aux utilisateurs des **recettes personnalisées** basées sur un produit sélectionné.  
L’objectif : aider à cuisiner des repas simples, sains et adaptés aux contraintes de chacun.

Générer ces recettes directement depuis OpenFoodFacts est impossible :

- aucune base ne propose des recettes prêtes à l’emploi
- les produits n’ont pas de relations sémantiques entre eux
- impossible de proposer un texte structuré (étapes, portions, variantes)

D’où l’idée d’utiliser un **modèle d’IA (LLM)** pour créer automatiquement des recettes cohérentes et personnalisées.

---

## 2. Idée : utiliser une IA pour générer dynamiquement des recettes

### Principe :

1. L’utilisateur sélectionne un produit (ex : “Yaourt nature Danone”)
2. L’application transmet à l’IA :
   - le **produit principal**
   - les **allergènes à éviter**
   - les **contraintes de régime** éventuelles
3. L’IA génère une recette complète :
   - titre
   - liste d’ingrédients
   - étapes de préparation
   - temps / difficulté
   - calories par personne
4. Le résultat est renvoyé en **JSON**, stocké pour éviter les appels répétés.

---

## 3. Contraintes techniques — Limites de tokens des IA

Pour générer une recette, il faut connaître la **taille maximale** autorisée par les modèles.

### Taille typique d’une recette

- Prompt : 80 à 150 tokens
- Réponse : 150 à 250 tokens  
  **1 recette ≈ 200–400 tokens**

### Capacités des modèles modernes (2025)

| Modèle           | Contexte maximum             |
| ---------------- | ---------------------------- |
| **GPT-4.1-mini** | 128 000 tokens               |
| **GPT-4.1**      | 128 000 tokens               |
| **GPT-4o**       | 200 000 tokens               |
| **Claude 3.5**   | 200 000 tokens               |
| **Gemini 2.0**   | 1 000 000 – 2 000 000 tokens |

**Les recettes sont extrêmement petites comparées aux limites disponibles.**  
Même 100 recettes générées en un seul appel ne dépasseraient pas les limites.

### Conclusion

Les limitations de tokens **ne posent absolument aucun problème** pour la génération de recettes dans Nutri-Check.

---

## 4. Pourquoi une IA est adaptée ici ?

Contrairement au remplissage de la DB OpenFoodFacts (trop lourd),  
la génération de recettes présente plusieurs avantages :

- Les **inputs sont très courts** → Peu de tokens
- Les **sorties sont courtes** → Peu de tokens
- Les recettes sont **créatives**, difficiles à générer par règles fixes
- Pas besoin de traiter des millions de produits → coût minime

C’est un usage **simple, rapide et parfaitement scalable**.

---

## 5. Paramètres nécessaires pour générer une recette

Pour que l’IA produise une recette adaptée, il suffit de transmettre :

| Paramètre                                               | Rôle                                          |
| ------------------------------------------------------- | --------------------------------------------- |
| **Produit sélectionné**                                 | Base centrale de la recette                   |
| **Allergènes à éviter**                                 | Exclusion automatique d’ingrédients dangereux |
| **Régime alimentaire** (vegan, végétarien, halal, etc.) | Adaptation de la recette                      |

Ces trois paramètres sont **suffisants dans 95% des cas**.

Éventuellement, Nutri-Check pourra ajouter :

- nombre de personnes
- niveau de difficulté
- objectif calorique
- temps maximal

Mais ce sont des options.

---

## 6. Exemple de workflow

1. L’utilisateur choisit un produit → ex : “Houmous nature”
2. L’app détecte :
   - Allergènes : sésame, pois-chiche → ok
   - Régime : végétalien (si sélectionné)
3. Nutri-Check envoie à l’IA :

```json
{
  "product": "Houmous nature",
  "excluded_allergens": ["gluten"],
  "diet": "vegan"
}
```
