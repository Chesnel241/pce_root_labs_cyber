// pce-checkout-service — point d'entrée applicatif (extrait).
// L'application elle-même est anodine ; le risque vient d'une DÉPENDANCE
// typosquattée tirée par package.json. C'est la chaîne d'approvisionnement
// (supply chain) qu'il faut auditer, pas ce fichier.
'use strict';

require('dotenv').config();
const express = require('express');

const app = express();

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`pce-checkout-service en écoute sur le port ${port}`);
});
