// ================================================
//  CHATVOCAL - W&N PRODUCTION
//  Fichier de configuration des jeux
// ================================================
//
//  Pour ajouter un jeu :
//  1. Copie un bloc "game_XXX" ci-dessous
//  2. Change l'id, le nom, le rayon et la clé API
//  3. Redémarre le serveur
//  4. Mets le même gameId + apiKey dans le script Roblox

module.exports = {
  games: {

    "137130062672598": {
      name: "TESTPLACE",       // Nom affiché sur le site
      proximityRadius: 50,           // Rayon de proximité (unités Roblox)
      apiKey: "cle_secrete_001"      // Clé secrète à mettre dans le script Roblox
    },

    "game_002": {
      name: "Mon Deuxième Jeu",
      proximityRadius: 80,
      apiKey: "cle_secrete_002"
    }

    // Exemple supplémentaire :
    // "game_003": {
    //   name: "Troisième Jeu",
    //   proximityRadius: 30,
    //   apiKey: "cle_secrete_003"
    // }

  }
};
