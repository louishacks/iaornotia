import { createClient } from '@supabase/supabase-js';

export const handler = async function(event, context) {
  console.log('Début de la fonction getstats');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    console.log('Récupération des images les plus mal classifiées...');
    // Récupérer les 3 images les plus mal classifiées
    const { data: topImages, error: imagesError } = await supabase
      .from('image_stats')
      .select('url, wrong_count')
      .order('wrong_count', { ascending: false })
      .limit(3);

    if (imagesError) {
      console.error('Erreur lors de la récupération des top images:', imagesError);
      throw imagesError;
    }
    console.log('Top images récupérées:', topImages);

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
        topImages: topImages || [],
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