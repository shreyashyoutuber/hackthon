import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const client = await clientPromise;
    const db = client.db("eduwise_db");

    // Final update: Set password and mark as fully verified
    await db.collection("users").updateOne(
      { email },
      { $set: { password: password, isVerified: true } } 
    );

    const user = await db.collection("users").findOne({ email });
    
    return NextResponse.json({ 
      success: true, 
      userType: user.userType 
    });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Error finalizing account." }, { status: 500 });
  }
}