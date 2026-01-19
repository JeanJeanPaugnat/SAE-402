# SAE 4.02 - Dispositif Interactif XR
## Concevoir une Application de Réalité Mixte avec A-Frame et WebXR

**IUT du Limousin | Département MMI | BUT2 Année 2025-26**

---

## 📋 Table des matières
- [Vue d'ensemble](#vue-densemble)
- [Tâches Initiales](#tâches-initiales)
- [Structure du Projet](#structure-du-projet)
- [Calendrier](#calendrier)
- [Livrables](#livrables)
- [Technologies](#technologies)
- [Ressources](#ressources)

---

## 🎯 Vue d'ensemble

Cette SAE vous demande de **concevoir et développer une application interactive XR** (réalité mixte) pour un casque Meta Quest 3 en utilisant **A-Frame** et **WebXR**. 

### Compétences ciblées
- Exprimer un message avec les médias numériques pour informer et communiquer
- Développer pour le web et les médias numériques

### Apprentissages critiques
- AC23.02 - Définir une iconographie (illustrations, photographies, vidéos)
- AC23.04 - Imaginer, écrire et scénariser pour communication multimédia/transmédia
- AC23.06 - Élaborer et produire animations, designs sonores, effets spéciaux, visualisations de données, 3D
- AC24.03 - Intégrer, produire ou développer interactions riches ou dispositifs interactifs

### Question Centrale
**Comment développer une application interactive plaçant les utilisateurs au centre du dispositif ?**

---

## 📅 Tâches Initiales (Avant de coder)

| # | Tâche | Description | Durée | Assigné | Priorité |
|---|-------|-------------|-------|---------|----------|
| 1 | **Brainstorming d'idée** | Réunion trinôme pour générer des concepts d'application XR (jeu, éducatif, artistique, etc.) | 1-2h | Tous | 🔴 CRITIQUE |
| 2 | **Validation de l'idée** | Soumettre l'idée aux enseignants pour validation | 1-2j | Responsable groupe | 🔴 CRITIQUE |
| 3 | **Créer le dépôt GitHub** | Initialiser le repository et partager avec les enseignants (benoit.crespin@unilim.fr, frederic.mora@unilim.fr, denis.springinsfeld@unilim.fr) | 30min | Responsable Git | 🔴 CRITIQUE |
| 4 | **Répartition des tâches** | Définir qui fait quoi pour la semaine 1 | 30min | Tous | 🔴 CRITIQUE |
| 5 | **Créer le Gantt prévu** | Planifier les tâches, durées, assignations pour 3 semaines | 1-2h | Chef de projet | 🔴 CRITIQUE |
| 6 | **Recherche technologique** | Étudier A-Frame et WebXR, consulter la documentation | 2-3h | Tous | 🟡 IMPORTANT |
| 7 | **Prototypage initial** | Créer première maquette testable en ligne (HTML/A-Frame basique) | 2-3h | Dev lead | 🟡 IMPORTANT |
| 8 | **Prévoir le prêt de casques** | Contacter amelin.chanteloup@unilim.fr (studio audiovisuel) | 1j | Responsable | 🟡 IMPORTANT |
| 9 | **Environnement dev** | Mettre en place Python, un serveur local ou GitHub Pages | 1h | Dev lead | 🟡 IMPORTANT |
| 10 | **Document livrables #1** | Préparer la présentation de l'idée (2 pages max, en anglais) | 2-3h | Responsable doc | 🟡 IMPORTANT |

---

## 📁 Structure du Projet

```
SAE-402/
├── README.md
├── docs/                       # Documentation du projet
│   ├── livrable_1.pdf         # Idée, interactions, Gantt, liens
│   ├── livrable_2.pdf         # Première version + avancée
│   ├── livrable_3.pdf         # Version finale + gestion projet
│   ├── livrable_4.pdf         # Avancement individuel
│   └── planning_gantt.xlsx     # Gantt détaillé
├── src/                        # Code source
│   ├── index.html             # Page principale A-Frame
│   ├── js/
│   │   ├── main.js           # Script principal
│   │   ├── interactions.js    # Gestion des clics/contrôleurs
│   │   ├── animations.js      # Animations de la scène
│   │   └── utils.js           # Fonctions utilitaires
│   ├── assets/                # Ressources (modèles 3D, images, sons)
│   │   ├── models/
│   │   ├── textures/
│   │   └── sounds/
│   └── css/
│       └── style.css          # Styles additionnels
├── videos/                     # Captures vidéo screencast Meta
│   ├── demo_v1.mp4
│   ├── demo_v2.mp4
│   └── demo_final.mp4
└── .gitignore                  # Fichiers à ignorer
```

---

## 📅 Calendrier

### 🔷 Semaine 1 (19-23 Janvier) - Idée & Conception
| Date | Heure | Enseignant | Tâche |
|------|-------|-----------|-------|
| 19/01 | 16:00-17:30 | SPRINGINSFELD Denis | Session 1 |
| 20/01 | 08:00-09:30 | CRESPIN Benoit | Session 2 |
| 21/01 | 08:00-09:30 | MORA Frédéric | Session 3 |
| **23/01** | — | — | **📦 LIVRABLE #1** |

**Objectifs:** Présenter l'idée validée, interactions prévues, premier Gantt, maquettes initiales

### 🔷 Semaine 2 (26-30 Janvier) - Développement V1
| Date | Heure | Enseignant |
|------|-------|-----------|
| 26/01 | 10:30-12:00 | CRESPIN Benoit |
| 26/01 | 16:00-17:30 | SPRINGINSFELD Denis |
| 27/01 | 15:30-17:00 | MORA Frédéric |
| **30/01** | — | **📦 LIVRABLE #2** |

**Objectifs:** Première version fonctionnelle avec captures d'écran, avancée, améliorations prévues

### 🔷 Semaine 3 (02-06 Février) - Finition Trinôme
| Date | Heure | Enseignant |
|------|-------|-----------|
| 02/02 | 10:30-12:00 | CRESPIN Benoit |
| 03/02 | 15:30-17:00 | MORA Frédéric |
| 04/02 | 08:00-09:30 | SPRINGINSFELD Denis |
| **06/02** | — | **📦 LIVRABLE #3** |

**Objectifs:** Version finale trinôme, gestion de projet documentée

### 🔷 Semaine 4 (09-13 Février) - Améliorations Individuelles
| Date | Heure | Enseignant | Tâche |
|------|-------|-----------|-------|
| 09/02 | 14:00-15:30 | CRESPIN Benoit | 🎬 **DÉMO** |
| 10/02 | 08:00-09:30 | SPRINGINSFELD Denis | Travail autonome |
| 10/02 | 09:30-11:00 | MORA Frédéric | Travail autonome |
| **13/02** | — | — | **📦 LIVRABLE #4** |

**Objectifs:** PDF d'avancement individuel

### 🔷 Semaine 5 (23-27 Février) - Portfolio & Présentation
| Date | Heure | Enseignant | Tâche |
|------|-------|-----------|-------|
| 23/02 | 08:00-10:00 | CRESPIN Benoit | Préparation orale |
| 25/02 | 08:00-10:00 | SPRINGINSFELD Denis | Préparation orale |
| **27/02 14:00** | — | — | **🎤 SOUTENANCE FINALE** |
| 06/03 | 13:30-15:30 | LAVEFVE Valérie | Portfolio |

---

## 📦 Livrables

### Livrable #1 (23 Janvier)
**Format:** PDF 2 pages max, en anglais
- ✅ Description de votre idée d'application XR
- ✅ Interactions envisagées
- ✅ Gantt détaillé (tâches, durées, assignations)
- ✅ Lien dépôt GitHub
- ✅ Liens maquettes testables en ligne (si disponibles)

### Livrable #2 (30 Janvier)
**Format:** PDF avec captures d'écran + liens
- ✅ Première version de l'application
- ✅ Captures d'écran annotées
- ✅ Avancée par rapport aux objectifs initiaux
- ✅ Améliorations envisagées + planning
- ✅ Contribution de chaque membre
- ✅ Lien vers l'application hébergée
- ✅ Lien vidéo screencast Meta

### Livrable #3 (6 Février)
**Format:** PDF complet + versioning Git
- ✅ Version finale de l'application
- ✅ Gestion de projet: planification réelle vs prévue
- ✅ Tâches non terminées et raisons
- ✅ Améliorations possibles avec plus de temps
- ✅ Temps total passé par membre
- ✅ Détail des contributions individuelles
- ✅ Liens app + vidéos screencast Meta

### Livrable #4 (13 Février)
**Format:** PDF 2 pages
- ✅ Avancement des améliorations individuelles
- ✅ Résultats obtenus
- ✅ Choix: poursuivre le projet existant ou refonte?

### Livrable #5 (Avant 27 Février)
**Format:** Site web complet + soutenance
- ✅ Site web présentant l'application finale
- ✅ Captures vidéos de qualité
- ✅ Exemples de code (fonctionnalités-clés)
- ✅ Lien dépôt GitHub
- ✅ Ressources consultées
- ✅ Application accessible depuis le site
- ✅ Support de présentation orale

---

## 🛠️ Technologies

### Obligatoires
- **A-Frame** - Framework VR/AR basé sur Three.js
- **WebXR** - API d'accès aux casques VR/AR
- **JavaScript** - Interactivité et logique
- **HTML5/CSS3** - Structure et style

### Recommandées
- **GitHub** - Versioning et collaboration
- **GitHub Pages** ou serveur externe - Hébergement
- **Python** - Serveur local (`python3 ./serveur.py`)
- **Meta Screencast** - Capture vidéo casque

### Ressources 3D
- **Poly.pizza** - Modèles 3D low-poly gratuits
- **Sketchfab** - Modèles 3D variés
- **Blender** - Créer vos propres modèles (optionnel)

---

## 🚀 Démarrage Rapide

### 1️⃣ Développement Local
```bash
# Cloner le dépôt
git clone <votre-repo-url>
cd SAE-402

# Lancer un serveur local
python3 serveur.py

# Ouvrir dans le navigateur
# http://localhost:8000 (ou l'URL affichée)

# Sur le casque Quest 3:
# Connecter à même réseau Wi-Fi (pas eduroam, utiliser téléphone)
# Ouvrir navigateur du casque
# Naviguer vers l'URL du PC
```

### 2️⃣ Déploiement Distant
```bash
# Pusher le code sur GitHub Pages (branche gh-pages)
# Ou déployer sur serveur externe

# URL accessible depuis partout:
# https://username.github.io/SAE-402
```

---

## 📊 Critères d'Évaluation

### Base d'Évaluation
| Niveau | Score | Critères |
|--------|-------|----------|
| **Convaincant** | 15 | Qualité professionnelle, défauts mineurs |
| **Mitigé** | 10 | Résultat intéressant, défauts majeurs |
| **Insuffisant** | 5 | Non utilisable, ne répond pas à la demande |

### Modulations
- 📈 Acquisition des **apprentissages critiques** (AC23.02, AC23.04, AC23.06, AC24.03)
- 📊 **Implication** mesurée via activité GitHub
- 💻 **Qualité du code** et modularité
- 👥 **Collaboration** et gestion de projet

---

## 👥 Groupe 4
- **LIPPLER Manon**
- **PAUGNAT Jean**
- **GADER Wahel**

---

## 📞 Contacts Enseignants

| Enseignant | Email | Rôle |
|-----------|-------|------|
| Benoit CRESPIN | benoit.crespin@unilim.fr | Responsable |
| Frédéric MORA | frederic.mora@unilim.fr | Responsable |
| Denis SPRINGINSFELD | denis.springinsfeld@unilim.fr | Responsable |
| Amelin CHANTELOUP | amelin.chanteloup@unilim.fr | Prêt casques VR |

---

## 📚 Ressources

### Documentation Officielle
- [A-Frame Documentation](https://aframe.io/docs/)
- [WebXR Specification](https://immersiveweb.github.io/)
- [MDN - WebXR API](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API)

### Exemples
- [A-Frame Examples](https://aframe.io/examples/)
- [WebXR Samples](https://immersiveweb.github.io/webxr-samples/)
- [Exemple SAE4.02 - Repo Benoit Crespin](https://github.com/BenoitCrespin/SAE4.DWeb-DI.02-XR/)

### Assets 3D Gratuits
- [Poly.pizza](https://poly.pizza/) - Modèles low-poly
- [Sketchfab](https://sketchfab.com/) - Variété de modèles
- [OpenGameArt](https://opengameart.org/) - Assets libres

### Outils
- [Blender](https://www.blender.org/) - Modélisation 3D
- [Visual Studio Code](https://code.visualstudio.com/) - Éditeur
- [Python](https://www.python.org/) - Serveur local

---

## 📝 Notes Importantes

✅ **À retenir:**
- Réfléchir à l'**impact numérique** (modèles low-poly, optimisation)
- Tous les livrables en **anglais**
- Rester **réaliste** sur les fonctionnalités
- Utiliser **GitHub activement** pour la collaboration
- Tester sur **casque Quest 3** régulièrement

⚠️ **Pièges à éviter:**
- Trop de fonctionnalités qui ne peuvent pas être finies
- Oublier de "pusher" le code régulièrement
- Ignorer la qualité esthétique et UX
- Modèles 3D trop lourds → temps de chargement excessif

---

## 📄 Licence
Ce projet est un travail académique pour l'IUT du Limousin.

---

**Bonne chance ! 🚀✨**
