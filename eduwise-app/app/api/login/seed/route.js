import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("eduwise_db");

    // Define the test user
    const testUser = {
      email: "admin@test.com",
      password: "123", // Simple password for testing
      fullName: "Test Admin",
      userType: "student",
      isVerified: true
    };

    // Check if user already exists
    const existing = await db.collection("users").findOne({ email: testUser.email });
    
    if (existing) {
      return NextResponse.json({ message: "User admin@test.com already exists!" });
    }

    // Insert the user
    await db.collection("users").insertOne(testUser);

    return NextResponse.json({ 
      success: true, 
      message: "✅ User created! Email: admin@test.com | Password: 123" 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}