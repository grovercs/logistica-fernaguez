import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CLOUD_NAME = 'dz5bkdxb1';
const API_KEY = '983267183367234';
const API_SECRET = 'Aapo-IBXatjeQjst6iZJWiV0EZQ';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  public_ids: string[];
}

serve(async (req: Request) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { public_ids }: RequestBody = await req.json();

    if (!public_ids || public_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'No public_ids provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cloudinary Admin API: delete multiple resources via Basic Auth
    const credentials = btoa(`${API_KEY}:${API_SECRET}`);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ public_ids }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudinary deletion failed: ${errorText}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
