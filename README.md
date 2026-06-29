# 🌸 Liste de mariage — Arthur & Mathilde

Site web statique (GitHub Pages, sans base de données) pour notre liste de
mariage sur le thème d'un **voyage de noces au Japon** 🗾.

Les invités peuvent offrir une « activité » du voyage (vols, hôtel, plongée,
ramen…) ou un montant libre, et payer par **PayPal**, **virement** ou **carte
(Stripe)**. Un petit formulaire de confirmation nous prévient à chaque cadeau.

## 🗂️ Structure

```
index.html        Page principale
css/style.css     Styles (charte graphique)
js/app.js         Logique : chargement JSON, rendu, modale de paiement, confirmation
data/gifts.json   Liste des activités (titre, emoji, prix, catégorie, image…)
data/config.json  Infos couple + moyens de paiement + endpoint de notification
```

## ⚙️ À configurer (fichier `data/config.json`)

Tout est centralisé dans `data/config.json`. Cherchez les `CHANGE_ME` / `XXXX` :

1. **PayPal** — `payment.paypalMe.url` : votre lien `https://paypal.me/votrepseudo`.
   Le site ajoute automatiquement le montant et rappelle de choisir
   « **Entre amis et famille** » pour éviter les frais.
2. **Virement** — `payment.bankTransfer` : `accountHolder`, `iban`, `bic`.
   L'IBAN s'affiche avec un bouton « Copier ».
3. **Stripe** — `payment.stripe` : laissez `enabled: false` tant que ce n'est
   pas prêt. Quand vous aurez un lien de paiement Stripe, mettez `enabled: true`
   et l'`url`. La note prévient déjà les invités des **frais** (~1,5 % + 0,25 €).
4. **Notification** — `notification.formEndpoint` : voir ci-dessous.

> Tant qu'un champ contient `CHANGE_ME` / `XXXX`, le moyen de paiement
> correspondant est automatiquement **masqué**. Vous pouvez donc déployer
> progressivement.

## 📬 Être prévenu à chaque cadeau

Le site n'a pas de serveur : on s'appuie sur un service gratuit qui transforme
un formulaire en email. Deux options simples :

### Option A — FormSubmit (aucun compte)
1. Mettez dans `config.json` :
   `"formEndpoint": "https://formsubmit.co/votre@email.com"`
2. Au **premier** envoi, FormSubmit vous enverra un mail de confirmation à
   valider une seule fois. Ensuite, chaque cadeau arrive dans votre boîte mail.

### Option B — Formspree (compte gratuit, 50 envois/mois)
1. Créez un formulaire sur [formspree.io](https://formspree.io), récupérez
   l'URL `https://formspree.io/f/xxxxxx`.
2. Collez-la dans `notification.formEndpoint`.
3. Bonus : Formspree peut aussi pousser vers un Google Sheet, Slack, etc.

> Si l'endpoint reste en `CHANGE_ME`, le formulaire remercie quand même
> l'invité mais n'envoie rien (vous serez alors prévenu via PayPal / votre banque).

## 🎁 Modifier la liste des cadeaux

Éditez `data/gifts.json`. Chaque entrée :

```json
{
  "id": "plongee",
  "emoji": "🤿",
  "title": "Plongée sous-marine à Okinawa",
  "description": "Explorer les récifs coralliens...",
  "price": 220,
  "category": "Aventure",
  "image": ""
}
```

- `emoji` s'affiche en grand si aucune `image` n'est fournie.
- `image` : URL ou chemin relatif (ex. `assets/plongee.jpg`) — remplace l'emoji.
- `category` : sert aussi aux filtres en haut de page.

## 🚀 Déploiement GitHub Pages

1. Repo **public** → onglet **Settings → Pages**.
2. *Source* : **Deploy from a branch**, branche `main` (ou la branche voulue),
   dossier `/ (root)`.
3. Le site sera dispo sur `https://VOTRE_USER.github.io/mariage-arthur-mathilde/`.

Le fichier `.nojekyll` est présent pour que GitHub serve les fichiers tels quels.

## 🧪 Tester en local

Les `fetch()` du JSON ne marchent pas en `file://`. Lancez un petit serveur :

```bash
python3 -m http.server 8000
# puis ouvrez http://localhost:8000
```

## 🎨 Charte graphique

Couleurs (variables CSS dans `css/style.css`) :
bleu marine `#113B54`, vert d'eau `#E2F4DF`, pervenche `#BBD1FF`,
chartreuse `#DBE64C`, vert sapin `#024442`. Aucun noir pur.
