import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { path, expires = 3600 } = body || {}

    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

  // Verify user session via cookies (supabaseAdmin client does not rely on cookies here)
  // As an extra measure, we can require an Authorization header: Bearer <access_token>
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  // Validate token and permissions with Supabase
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token as string)
    if (userErr || !userData || !userData.user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

  // Here you can check the user's role in the profiles table if you want to enforce authorization
  // Generate signed URL
    const { data, error } = await supabaseAdmin.storage
      .from(process.env.POSTS_BUCKET_NAME || 'posts')
      .createSignedUrl(path, expires)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error('Error generating signed url', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
