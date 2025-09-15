import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Cliente com service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    // Tentar ler JSON do body (sendBeacon envia Blob com JSON)
    let body: unknown = null;
    try {
      body = await request.json();
    } catch (err) {
      // request.json() pode falhar quando sendBeacon envia um Blob; tentar text()
      console.debug('request.json() failed, falling back to text():', err);
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      } catch (e) {
        console.debug('Parsing request.text() as JSON failed:', e);
        body = {};
      }
    }

    const parsed = body as { psicologo_id?: string; new_status?: boolean } | null;

    const psicologo_id = parsed?.psicologo_id;
    const new_status = typeof parsed?.new_status !== 'undefined' ? parsed.new_status : false;

    if (!psicologo_id) {
      return NextResponse.json({ success: false, error: 'psicologo_id is required' }, { status: 400 });
    }

    // Chamar função SQL com service role para garantir execução mesmo sem cookie
    const { data, error } = await supabaseAdmin.rpc('update_psicologo_status', {
      psicologo_id: psicologo_id,
      new_status: new_status
    });

    if (error) {
      console.error('❌ set-status-keepalive RPC error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ set-status-keepalive internal error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
