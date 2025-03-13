import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const handler = async () => {
    try {
        // ✅ Get top 3 most misclassified images
        const { data: topImages, error: imgError } = await supabase
            .from('image_stats')
            .select('url, wrong_count')
            .order('wrong_count', { ascending: false })
            .limit(10);

        if (imgError) throw imgError;

        // ✅ Get percentile ranking
        const { data: allScores, error: scoreError } = await supabase
            .from('player_scores')
            .select('score');

        if (scoreError) throw scoreError;

        const scores = allScores.map(s => s.score);
        scores.sort((a, b) => a - b);
        const playerScore = scores[scores.length - 1];

        const percentileRank = ((scores.indexOf(playerScore) / scores.length) * 100).toFixed(2);

        return {
            statusCode: 200,
            body: JSON.stringify({ topImages, percentileRank })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
