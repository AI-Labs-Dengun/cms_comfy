import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const psicologoId = formData.get('psicologo_id') as string;

    if (!psicologoId) {
      return NextResponse.json(
        { error: 'Psicologo ID is required' },
        { status: 400 }
      );
    }

    console.log('📡 API - Processando logout do psicólogo via beacon:', psicologoId);

    // Set psychologist as offline
    const { error } = await supabase.rpc('handle_psicologo_logout', {
      psicologo_id: psicologoId
    });

    if (error) {
      console.error('❌ API - Erro ao definir psicólogo como offline:', error);
      return NextResponse.json(
        { error: 'Failed to set psychologist offline' },
        { status: 500 }
      );
    }

    console.log('✅ API - Psicólogo definido como offline com sucesso');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API - Erro inesperado no logout do psicólogo:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}