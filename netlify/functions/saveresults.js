import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

export const handler = async (event) => {
    try {
        const { score, totalImages, wrongAnswers } = JSON.parse(event.body);

        // ✅ Save player score
        const { error: scoreError } = await supabase
            .from('player_scores')
            .insert([{ score, total_images: totalImages }]);

        if (scoreError) throw scoreError;

        // ✅ Update wrong answer counts
        for (const { url, wasWrong } of wrongAnswers) {
            if (wasWrong) {
                const { data, error } = await supabase
                    .from('image_stats')
                    .select('wrong_count')
                    .eq('url', url)
                    .single();

                if (!error && data) {
                    await supabase
                        .from('image_stats')
                        .update({ wrong_count: data.wrong_count + 1 })
                        .eq('url', url);
                } else {
                    await supabase
                        .from('image_stats')
                        .insert([{ url, wrong_count: 1 }]);
                }
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Results saved successfully" })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
