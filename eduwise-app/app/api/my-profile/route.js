import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req) {
  try {
    const { email } = await req.json();

    // 🚨 FIX: If no email is provided, stop the server from crashing and send a proper error.
    if (!email) {
      return NextResponse.json({ success: false, message: "Authentication required. Please log in again." }, { status: 401 });
    }
    // END FIX

    // ... The rest of the connection and finding user logic ...
    const client = await clientPromise;
    const db = client.db("eduwise_db");

    const user = await db.collection("users").findOne({ email: email });

    if (user) {
      // Send back the user's data
      return NextResponse.json({
        success: true,
        user: {
          fullName: user.fullName || "Student",
          email: user.email,
          overall_gpa: "3.8", // Dummy Data
          attendance: "92%",
          interview_ready: "High"
        }
      });
    } else {
      // User not found in database (e.g., deleted account)
      return NextResponse.json({ success: false, message: "User not found in database." });
    }

  } catch (error) {
    // If the database connection fails or the logic has an error, it sends 500
    console.error("API Error in my-profile:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}