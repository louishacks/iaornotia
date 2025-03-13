const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  console.log('=== DÉBUT DE LA FONCTION GETSTATS ===');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Récupérer les 3 images les plus mal classifiées
    const { data: topImages, error: imagesError } = await supabase
      .from('image_stats')
      .select('*')
      .order('wrong_count', { ascending: false })
      .limit(3);

    if (imagesError) throw imagesError;

    console.log('Images récupérées:', topImages);

    // Compter le nombre total de tentatives dans player_scores
    const { count: totalAttempts, error: countError } = await supabase
      .from('player_scores')
      .select('id', { count: 'exact' });  // Compte le nombre total de lignes

    if (countError) {
      console.error('Erreur lors du comptage des tentatives dans player_scores:', countError);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Erreur lors du comptage des tentatives' })
      };
    }

    console.log(`Nombre total de tentatives dans player_scores: ${totalAttempts}`);

    // Vérifiez si totalAttempts est 0
    if (totalAttempts === 0) {
      console.warn('Aucune entrée trouvée dans player_scores. Vérifiez la table pour vous assurer qu\'il y a des données.');
    }

    // Traiter chaque image une par une
    const updatedTopImages = [];
    for (const image of topImages) {
      console.log(`\n=== Traitement de l'image ${image.url} ===`);
      
      // Compter les mauvaises réponses
      const wrongAnswers = image.wrong_count;  // Utiliser le wrong_count existant

      // Mise à jour dans image_stats
      const { data: updateResult, error: updateError } = await supabase
        .from('image_stats')
        .update({
          wrong_count: wrongAnswers,
          total_attempts: totalAttempts  // Mettre à jour total_attempts avec le total global
        })
        .eq('url', image.url)
        .select()
        .single();

      if (updateError) {
        console.error(`Erreur mise à jour ${image.url}:`, updateError);
      } else {
        console.log('Résultat de la mise à jour:', updateResult);
        updatedTopImages.push(updateResult);
      }
    }

    console.log('\n=== Images finales mises à jour ===');
    console.log(JSON.stringify(updatedTopImages, null, 2));

    // Calcul du percentile (code existant)
    const { data: scores, error: scoresError } = await supabase
      .from('player_scores')
      .select('score');

    let percentileRank = 0;
    if (scores?.length > 0) {
      const lastScore = scores[scores.length - 1].score;
      const lowerScores = scores.filter(s => s.score < lastScore).length;
      percentileRank = (lowerScores / scores.length) * 100;
    }

    console.log('=== FIN DE LA FONCTION GETSTATS ===');

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topImages: updatedTopImages,
        percentileRank: percentileRank.toFixed(2)
      })
    };

  } catch (error) {
    console.error('ERREUR DANS GETSTATS:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message
      })
    };
  }
}; 