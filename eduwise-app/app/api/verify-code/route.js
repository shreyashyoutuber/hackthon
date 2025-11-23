import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    const { email, code } = await req.json();
    const client = await clientPromise;
    const db = client.db("eduwise_db");

    const user = await db.collection("users").findOne({ email });

    if (user && user.verificationCode === code) {
      // Code matched, allow user to proceed to set password
      return NextResponse.json({ success: true, message: "Code matched." });
    } else {
      return NextResponse.json({ success: false, message: "Invalid Code" });
    }

  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error during verification." }, { status: 500 });
  }
}