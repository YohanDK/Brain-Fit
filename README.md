# Néophyte

Garder l'esprit vif à l'heure de l'IA : écriture, raisonnement, un exercice chaque jour.

Le site s'installe sur le téléphone comme une appli. Avec un compte, les progrès sont les mêmes sur tous tes appareils, et le coach répond grâce à l'API Claude.

## Comment c'est construit

| Partie | Où | Rôle |
|---|---|---|
| `public/` | GitHub Pages | Le site lui-même (une seule page), installable et utilisable hors ligne. |
| `supabase/setup.sql` | Supabase | La table qui garde tes progrès. Chacun ne voit que les siens. |
| `supabase/cercle.sql` | Supabase | Les cercles d'amis et leur classement de la semaine, et l'effacement de ses données. |
| `supabase/functions/coach/` | Supabase | Le coach : il reçoit la demande de la page et appelle Claude avec ta clé API, qui reste secrète. |
| `supabase/functions/account/` | Supabase | Efface un compte et toutes ses données, à la demande de son propriétaire. |
| `.github/workflows/pages.yml` | GitHub | Remet le site en ligne à chaque changement. |
| `.github/workflows/deploy-coach.yml` | GitHub | Remet le coach à jour sur Supabase à chaque changement. |

Le bilan du dimanche se fait tout seul : dès dimanche 18 h, l'appli calcule le bilan de la semaine (jours actifs, ce qui progresse, le point à travailler, les défis, ta place dans le cercle et une action pour la semaine suivante), sans coach ni clé. Il est à lire en haut de l'onglet Coach. Une fois le coach branché, il ajoute en plus son propre bilan, rédigé.

## Mise en route (une seule fois)

### 1. Supabase : le compte et les données

1. Crée un compte sur [supabase.com](https://supabase.com) (« Continue with GitHub » est le plus simple), puis un projet nommé `brain-fit`, région **Paris (eu-west-3)**. Le mot de passe de la base ne te resservira pas.
2. Dans le projet, ouvre **SQL Editor**, colle tout le contenu de [`supabase/setup.sql`](supabase/setup.sql), puis clique sur **Run**. Fais de même, dans une nouvelle requête, avec [`supabase/cercle.sql`](supabase/cercle.sql).
3. Dans **Project Settings › API Keys**, copie l'**URL du projet** et la **clé publique** (`publishable`, ou `anon`). Ces deux valeurs peuvent être partagées sans risque : elles vont dans `public/config.js`.
4. Note l'**identifiant du projet** : ce sont les lettres de l'adresse, `https://<identifiant>.supabase.co`.
5. Crée un jeton d'accès sur [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) (nom : `github`). Garde-le pour l'étape 3.

### 2. Claude : la clé API du coach

1. Sur [console.anthropic.com](https://console.anthropic.com), ajoute un moyen de paiement et un petit crédit (**Settings › Billing**).
2. Crée une clé dans **API Keys**. Ne la colle jamais dans une conversation : elle va seulement dans GitHub, à l'étape suivante.

### 3. GitHub : les secrets

Dans ce dépôt, **Settings › Secrets and variables › Actions › New repository secret**, ajoute :

| Nom | Valeur |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | le jeton de l'étape 1.5 |
| `SUPABASE_PROJECT_ID` | l'identifiant de l'étape 1.4 |
| `ANTHROPIC_API_KEY` | la clé de l'étape 2 |
| `ALLOWED_EMAIL` | ton adresse e-mail, celle de ton compte Néophyte : seul ce compte peut utiliser le coach |

Puis **Actions › Déployer le coach › Run workflow** pour mettre le coach en ligne.

Pour changer de modèle (par exemple un modèle moins cher), ajoute dans l'onglet **Variables** une variable `COACH_MODEL` avec l'identifiant du modèle, puis relance le workflow. Par défaut : `claude-opus-5-5`.

### 4. GitHub Pages : l'adresse du site

1. Dans ce dépôt, **Settings › Pages**, à la ligne **Source**, choisis **GitHub Actions**. C'est tout : pas d'autre compte à créer.
2. Puis **Actions › Publier le site › Run workflow**. Après une minute, le site est en ligne à l'adresse **https://yohandk.github.io/Brain-Fit/**. Chaque changement du dépôt le met à jour tout seul.
3. Dans Supabase, **Authentication › URL Configuration**, mets cette adresse comme **Site URL** : c'est là que mène le lien de confirmation du compte.

### 5. Sur ton téléphone

1. Ouvre l'adresse du site dans Safari (ou Chrome sur Android), puis **Partager › Sur l'écran d'accueil**.
2. Ouvre Néophyte depuis l'écran d'accueil et clique sur **Créer mon compte**. Confirme avec le lien reçu par e-mail, puis connecte-toi.
3. Pour inviter des amis dans ton cercle, laisse les inscriptions ouvertes : le coach reste réservé à ton adresse (`ALLOWED_EMAIL`), donc à ta clé. Si tu préfères garder Néophyte pour toi seul, dans Supabase, **Authentication › Sign In / Providers**, décoche **Allow new users to sign up**.

### 6. Reprendre tes progrès de l'ancienne version

1. Dans Néophyte ouvert dans l'app Claude : **Progrès › Sauvegarde › Copier mes données**.
2. Dans le nouveau site, connecté : **Réglages (roue dentée en haut) › Sauvegarde › Coller des données**, colle, puis **Fusionner avec mes progrès**. Rien n'est effacé, les deux historiques s'additionnent.

## Coût

L'hébergement (GitHub Pages, Supabase) est gratuit à cette échelle. Le coach est payé à l'usage sur la console Claude : compte quelques centimes par réponse, donc quelques euros à une quinzaine d'euros par mois selon ton usage. Tu peux fixer une limite de dépense mensuelle dans **Settings › Limits** de la console.
