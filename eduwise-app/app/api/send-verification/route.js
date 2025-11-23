import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    const { email, fullName, schoolId, userType, phoneNumber } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("eduwise_db");

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return NextResponse.json({ success: false, message: "User already registered." });
    }

    // MOCK CODE: Set a fixed code for testing
    const verificationCode = "123456"; 

    // Store unverified user data
    await db.collection("users").updateOne(
      { email },
      { $set: { email, fullName, schoolId, userType, phoneNumber, verificationCode, isVerified: false, createdAt: new Date() } },
      { upsert: true }
    );

    // Front-end expects success to advance to step 2
    return NextResponse.json({ success: true, message: "Verification code sent (Test code: 123456)." });

  } catch (error) {
    return NextResponse.json({ success: false, message: "Server error during registration." }, { status: 500 });
  }
}
