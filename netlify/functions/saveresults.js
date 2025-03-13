import { createClient } from '@supabase/supabase-js';

export const handler = async function(event, context) {
  // Initialiser le client Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Vérifier que la requête est de type POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: 'Méthode non autorisée' })
      };
    }

    // Récupérer les données du body
    const { score, totalImages, wrongAnswers } = JSON.parse(event.body);
    console.log('Données reçues:', { score, totalImages, wrongAnswersCount: wrongAnswers.length });

    // Sauvegarder le score du joueur
    const { data: scoreData, error: scoreError } = await supabase
      .from('player_scores')
      .insert([{ 
        score, 
        total_images: totalImages 
      }])
      .select();

    if (scoreError) {
      console.error('Erreur lors de la sauvegarde du score:', scoreError);
      throw scoreError;
    }
    console.log('Score sauvegardé:', scoreData);

    // Mettre à jour les statistiques des images
    for (const answer of wrongAnswers) {
      if (!answer.wasWrong) continue;

      console.log('Traitement de l\'image:', answer.url);

      // Vérifier si l'image existe déjà
      const { data: existingImage, error: selectError } = await supabase
        .from('image_stats')
        .select('wrong_count')
        .eq('url', answer.url)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erreur lors de la recherche de l\'image:', selectError);
        throw selectError;
      }

      if (existingImage) {
        const { error: updateError } = await supabase
          .from('image_stats')
          .update({ wrong_count: existingImage.wrong_count + 1 })
          .eq('url', answer.url);

        if (updateError) {
          console.error('Erreur lors de la mise à jour du compteur:', updateError);
          throw updateError;
        }
        console.log('Compteur mis à jour pour:', answer.url);
      } else {
        const { error: insertError } = await supabase
          .from('image_stats')
          .insert([{ url: answer.url, wrong_count: 1 }]);

        if (insertError) {
          console.error('Erreur lors de l\'insertion de l\'image:', insertError);
          throw insertError;
        }
        console.log('Nouvelle image ajoutée:', answer.url);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Résultats sauvegardés avec succès',
        scoreData
      })
    };

  } catch (error) {
    console.error('Erreur générale:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: 'Erreur lors de la sauvegarde',
        error: error.message 
      })
    };
  }
}; 