import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { auth, currentUser } from "@clerk/nextjs";
import { eq } from "drizzle-orm";

import { NextResponse } from "next/server";
const return_url = (process.env.NEXT_BASE_URL + "/") as string;
export async function GET() {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    if (!userId) {
      return new NextResponse("unauthorized", { status: 401 });
    }
    const _userSubscription = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    if (_userSubscription[0] && _userSubscription[0].stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: _userSubscription[0].stripeCustomerId,
        return_url,
      });
      console.log("something", stripeSession);

      return NextResponse.json({ url: stripeSession.url });
    }
    const stripeSession = await stripe.checkout.sessions.create({
      success_url: return_url,
      cancel_url: return_url,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user?.emailAddresses[0].emailAddress,
      line_items: [
        {
          price_data: {
            currency: "USD",
            product_data: {
              name: "ChatPDF PRO",
              description: "unlimited ",
            },
            unit_amount: 2000,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
    });
    console.log("ssssssssssssssssss", stripeSession);

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    console.log("strip error", error);
    return new NextResponse("internal server error", { status: 501 });
  }
}
