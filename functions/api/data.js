export async function onRequestGet(context) {
    const { env } = context;
    const stateKey = 'radprompt_state_v1';
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    try {
        if (!env.RADPROMPT_KV) {
            return new Response(JSON.stringify({ error: 'KV Namespace not bound', items: [], favorites: [] }), {
                status: 500,
                headers
            });
        }

        const stateData = await env.RADPROMPT_KV.get(stateKey, 'json');
        
        if (stateData) {
            return new Response(JSON.stringify(stateData), {
                status: 200,
                headers
            });
        }
        
        return new Response(JSON.stringify({ items: [], favorites: [] }), {
            status: 200,
            headers
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message, items: [], favorites: [] }), {
            status: 500,
            headers
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    const stateKey = 'radprompt_state_v1';
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
    
    try {
        if (!env.RADPROMPT_KV) {
            return new Response(JSON.stringify({ success: false, error: 'KV Namespace not bound' }), {
                status: 500,
                headers
            });
        }

        let newState;
        try {
            newState = await request.json();
            if (!newState || !Array.isArray(newState.items)) {
                throw new Error('Invalid payload format');
            }
        } catch (parseError) {
            return new Response(JSON.stringify({ success: false, error: 'Bad Request: Invalid JSON' }), {
                status: 400,
                headers
            });
        }

        await env.RADPROMPT_KV.put(stateKey, JSON.stringify(newState));
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers
        });
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    });
}