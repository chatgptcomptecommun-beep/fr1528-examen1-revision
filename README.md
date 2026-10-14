# FR1528 — Cap sur l’Examen 1

Site statique interactif de révision pour l’examen de mi-session du cours **FR1528 — Rédaction technique et scientifique**.

Le contenu pédagogique est fondé sur l’annonce officielle de l’examen et sur les ressources des semaines 1 à 5. Chaque notion cite sa source Google Drive. Les explications, exercices et scénarios publiés ici sont originaux ou adaptés : aucun document de cours n’est redistribué.

## Fonctionnalités

- parcours progressif en six modules;
- fiches « comprendre / utilité / erreurs / exemple / source »;
- QCM à rétroaction immédiate, questions à trous, correction et réorganisation;
- atelier guidé adapté de l’activité de rédaction de la semaine 5;
- trois simulations de 3 heures avec minuterie, correction automatique et grille d’autoévaluation;
- checklist et progression conservées dans `localStorage`;
- interface responsive, thème clair/sombre et styles d’impression.

## Lancement local

Le projet n’a aucune dépendance et ne nécessite aucune compilation.

Avec Python :

```powershell
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080`.

Il est aussi possible d’ouvrir directement `index.html`, mais un serveur local reproduit mieux le comportement de GitHub Pages.

## Architecture

```text
.
├── index.html                  # structure de l’interface
├── assets/
│   ├── css/styles.css         # design responsive et impression
│   └── js/
│       ├── data.js            # modules, exercices, simulations, références
│       └── app.js             # navigation, interactions et persistance
├── .github/workflows/pages.yml
└── README.md
```

## Mettre à jour le contenu

1. Modifier `assets/js/data.js`.
2. Pour toute nouvelle notion, renseigner les cinq champs : `understand`, `why`, `errors`, `example` et `source`.
3. Ajouter une URL Drive dans `url`; ne jamais attribuer un contenu à une ressource non lue.
4. Pour un QCM, utiliser un indice de réponse commençant à `0`.
5. Ouvrir le site localement et vérifier la console du navigateur avant publication.

Les données de progression sont stockées uniquement dans le navigateur de la personne qui utilise le site. Aucun résultat n’est envoyé à un serveur.

## Publication sur GitHub Pages

1. Créer un dépôt GitHub et y pousser la branche `main`.
2. Dans **Settings → Pages**, choisir **GitHub Actions** comme source.
3. Le workflow `.github/workflows/pages.yml` publiera automatiquement le site à chaque poussée sur `main`.

L’URL aura généralement la forme `https://UTILISATEUR.github.io/NOM-DU-DEPOT/`.

## Vérifications recommandées

```powershell
# Vérifier que les fichiers JavaScript sont syntaxiquement valides
node --check assets/js/data.js
node --check assets/js/app.js
```

Tester ensuite : navigation, thème sombre, progression, correction des exercices, brouillon de lettre, minuterie et affichage mobile.

## Sources et droits

La liste complète des ressources utilisées se trouve dans la page **Ressources** du site. Les liens Drive peuvent exiger l’accès au compte du cours.

Le plan de cours précise que le matériel pédagogique est protégé et ne doit pas être téléversé vers d’autres sites. Ce dépôt ne doit donc pas contenir de copies des PDF, DOCX ou PPTX du cours. Il publie uniquement des synthèses et activités originales/adaptées pour l’étude personnelle.


