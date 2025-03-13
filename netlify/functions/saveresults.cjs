const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Initialiser le client Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  // ... reste du code inchangé ...

  // Mettre à jour les statistiques des images
  for (const answer of wrongAnswers) {
    if (!answer.wasWrong) continue;

    console.log('Traitement de l\'image:', answer.url);
    // Nettoyage de l'URL pour éviter les problèmes de chemin
    const cleanUrl = answer.url.replace(/^\.\//, '');

    // Vérifier si l'image existe déjà
    const { data: existingImage, error: selectError } = await supabase
      .from('image_stats')
      .select('wrong_count')
      .eq('url', cleanUrl)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Erreur lors de la recherche de l\'image:', selectError);
      throw selectError;
    }

    if (existingImage) {
      const { error: updateError } = await supabase
        .from('image_stats')
        .update({ wrong_count: existingImage.wrong_count + 1 })
        .eq('url', cleanUrl);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du compteur:', updateError);
        throw updateError;
      }
      console.log('Compteur mis à jour pour:', cleanUrl);
    } else {
      const { error: insertError } = await supabase
        .from('image_stats')
        .insert([{ url: cleanUrl, wrong_count: 1 }]);

      if (insertError) {
        console.error('Erreur lors de l\'insertion de l\'image:', insertError);
        throw insertError;
      }
      console.log('Nouvelle image ajoutée:', cleanUrl);
    }
  }
}; 