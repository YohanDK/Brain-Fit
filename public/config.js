// Adresse du projet Supabase et sa clé publique (« publishable » ou « anon »).
// Ces deux valeurs sont faites pour être publiques : la sécurité vient des règles de la base.
window.BF_CONFIG={
  supabaseUrl:'https://kmcelzkxnxeqwwpvyycm.supabase.co',
  supabaseKey:'sb_publishable_y7Bnt_xi7saCiOzqZJwUww_2Otq4jGP',
  // passe à true une fois la fonction « coach » déployée avec la clé Claude
  coach:false,
  // bouton « Signaler un problème » (capture d'écran + commentaire) pendant la phase de test ; false pour le cacher
  retours:true,
  // réglage « Rappels » (notifications sur le téléphone) : true une fois rappels.sql lancé ; false pour le cacher et désabonner les appareils à leur prochaine visite
  rappels:true
};
