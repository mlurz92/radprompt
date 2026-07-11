export async function onRequestGet(context) {
    const { env } = context;
    try {
        const value = await env.RADPROMPT_KV.get('radprompt_state');
        if (value === null) {
            return new Response(JSON.stringify({ data: null, favorites: [] }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        return new Response(value, {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to fetch data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const body = await request.json();
        await env.RADPROMPT_KV.put('radprompt_state', JSON.stringify(body));
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to save data' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}