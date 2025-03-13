import { createClient } from '@supabase/supabase-js';

export const handler = async function(event, context) {
  console.log('Début de la fonction getstats');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    console.log('Récupération des images les plus mal classifiées...');
    // Récupérer les 3 images les plus mal classifiées avec le nombre total de tentatives
    const { data: topImages, error: imagesError } = await supabase
      .from('image_stats')
      .select(`
        url, 
        wrong_count,
        total_attempts
      `)
      .order('wrong_count', { ascending: false })
      .limit(3);

    if (imagesError) {
      console.error('Erreur lors de la récupération des top images:', imagesError);
      throw imagesError;
    }

    // Traitement pour chaque image
    const updatedTopImages = await Promise.all(topImages.map(async (image) => {
      console.log('Traitement de l\'image:', image.url);
      
      // Compter le nombre total de tentatives pour cette image
      const { data: attempts, error: attemptsError } = await supabase
        .from('player_scores')
        .select('id')
        .eq('image_url', image.url);

      if (attemptsError) {
        console.error('Erreur lors du comptage des tentatives:', attemptsError);
        return image;
      }

      const totalAttempts = attempts ? attempts.length : 0;
      console.log(`Image ${image.url}: Nombre de tentatives trouvées = ${totalAttempts}`);

      // Forcer la mise à jour avec upsert
      const { data: updateData, error: updateError } = await supabase
        .from('image_stats')
        .upsert({
          url: image.url,
          wrong_count: image.wrong_count || 0,
          total_attempts: totalAttempts
        }, {
          onConflict: 'url',
          returning: true
        });

      if (updateError) {
        console.error('Erreur lors de la mise à jour:', updateError);
        return image;
      }

      console.log('Mise à jour réussie:', updateData);
      return updateData[0];
    }));

    console.log('Top images après mise à jour:', JSON.stringify(updatedTopImages, null, 2));

    // Vérifier les données finales
    const { data: verificationData } = await supabase
      .from('image_stats')
      .select('url, total_attempts')
      .order('wrong_count', { ascending: false })
      .limit(3);

    console.log('Vérification finale des données:', verificationData);

    console.log('Récupération des scores...');
    // Récupérer tous les scores
    const { data: scores, error: scoresError } = await supabase
      .from('player_scores')
      .select('score');

    if (scoresError) {
      console.error('Erreur lors de la récupération des scores:', scoresError);
      throw scoresError;
    }
    console.log('Scores récupérés:', scores);

    // Calculer le percentile du dernier score
    let percentileRank = 0;
    if (scores && scores.length > 0) {
      const lastScore = scores[scores.length - 1].score;
      const lowerScores = scores.filter(s => s.score < lastScore).length;
      percentileRank = (lowerScores / scores.length) * 100;
      console.log('Calcul du percentile:', { lastScore, lowerScores, total: scores.length, percentileRank });
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        topImages: updatedTopImages || [],
        percentileRank: percentileRank.toFixed(2)
      })
    };

  } catch (error) {
    console.error('Erreur dans getstats:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message,
        stack: error.stack
      })
    };
  }
}; 