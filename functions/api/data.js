export async function onRequestGet(context) {
    const { env } = context;
    const stateKey = 'radprompt_state_v1';
    
    try {
        const stateData = await env.RADPROMPT_KV.get(stateKey, 'json');
        if (stateData) {
            return new Response(JSON.stringify(stateData), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(JSON.stringify({ items: [], favorites: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, items: [], favorites: [] }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const stateKey = 'radprompt_state_v1';
    
    try {
        const newState = await request.json();
        await env.RADPROMPT_KV.put(stateKey, JSON.stringify(newState));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}