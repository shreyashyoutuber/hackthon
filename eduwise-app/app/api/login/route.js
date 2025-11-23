import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    // 1. Get the email and password the user typed
    const { username, password } = await req.json();

    // 2. Connect to the Database
    const client = await clientPromise;
    const db = client.db("eduwise_db");

    // 3. Search for the user
    const user = await db.collection("users").findOne({ 
      email: username, 
      password: password 
    });

    if (user) {
      return NextResponse.json({ success: true, message: "Login Successful!", userType: user.userType });
    } else {
      return NextResponse.json({ success: false, message: "Invalid credentials" });
    }

  } catch (error) {
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}