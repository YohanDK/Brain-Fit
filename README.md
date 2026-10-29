# Brain Fit

Garder l'esprit vif à l'heure de l'IA : écriture, raisonnement, un exercice chaque jour.

Le site s'installe sur le téléphone comme une appli. Avec un compte, les progrès sont les mêmes sur tous tes appareils, et le coach répond grâce à l'API Claude.

## Comment c'est construit

| Partie | Où | Rôle |
|---|---|---|
| `public/` | Vercel | Le site lui-même (une seule page), installable et utilisable hors ligne. |
| `supabase/setup.sql` | Supabase | La table qui garde tes progrès. Chacun ne voit que les siens. |
| `supabase/functions/coach/` | Supabase | Le coach : il reçoit la demande de la page et appelle Claude avec ta clé API, qui reste secrète. |
| `.github/workflows/deploy-coach.yml` | GitHub | Remet le coach à jour sur Supabase à chaque changement. |

Le bilan du dimanche se fait tout seul : à la première ouverture après dimanche 18 h, le coach prépare le bilan de la semaine. Il est à lire dans l'onglet Coach.

## Mise en route (une seule fois)

### 1. Supabase : le compte et les données

1. Crée un compte sur [supabase.com](https://supabase.com) (« Continue with GitHub » est le plus simple), puis un projet nommé `brain-fit`, région **Paris (eu-west-3)**. Le mot de passe de la base ne te resservira pas.
2. Dans le projet, ouvre **SQL Editor**, colle tout le contenu de [`supabase/setup.sql`](supabase/setup.sql), puis clique sur **Run**.
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
| `ALLOWED_EMAIL` | ton adresse e-mail, celle de ton compte Brain Fit : seul ce compte peut utiliser le coach |

Puis **Actions › Déployer le coach › Run workflow** pour mettre le coach en ligne.

Pour changer de modèle (par exemple un modèle moins cher), ajoute dans l'onglet **Variables** une variable `COACH_MODEL` avec l'identifiant du modèle, puis relance le workflow. Par défaut : `claude-opus-5-5`.

### 4. Vercel : l'adresse du site

1. Sur [vercel.com](https://vercel.com), connecte-toi avec GitHub, puis **Add New › Project** et importe ce dépôt. Garde les réglages proposés et clique sur **Deploy**.
2. Ton site a son adresse (`https://brain-fit-….vercel.app`). Chaque changement du dépôt le met à jour tout seul.
3. Dans Supabase, **Authentication › URL Configuration**, mets cette adresse comme **Site URL** : c'est là que mène le lien de confirmation du compte.

### 5. Sur ton téléphone

1. Ouvre l'adresse du site dans Safari (ou Chrome sur Android), puis **Partager › Sur l'écran d'accueil**.
2. Ouvre Brain Fit depuis l'écran d'accueil et clique sur **Créer mon compte**. Confirme avec le lien reçu par e-mail, puis connecte-toi.
3. Une fois ton compte créé, dans Supabase, **Authentication › Sign In / Providers**, décoche **Allow new users to sign up** : personne d'autre ne pourra créer de compte.

### 6. Reprendre tes progrès de l'ancienne version

1. Dans Brain Fit ouvert dans l'app Claude : **Progrès › Sauvegarde › Copier mes données**.
2. Dans le nouveau site, connecté : **Progrès › Sauvegarde › Coller des données**, colle, puis **Fusionner avec mes progrès**. Rien n'est effacé, les deux historiques s'additionnent.

## Coût

L'hébergement (Vercel, Supabase, GitHub) est gratuit à cette échelle. Le coach est payé à l'usage sur la console Claude : compte quelques centimes par réponse, donc quelques euros à une quinzaine d'euros par mois selon ton usage. Tu peux fixer une limite de dépense mensuelle dans **Settings › Limits** de la console.
