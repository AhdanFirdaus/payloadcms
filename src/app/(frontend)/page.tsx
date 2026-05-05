import React, { ReactElement } from "react";
import Logo from "@/assets/logo.svg"
import Image from "next/image";
import Link from "next/link";

export default function page(): ReactElement{
  return <div className="flex flex-col mx-auto w-full max-w-4xl px-4">
    <div className="flex items-center justify-between py-4">
      <Image src={Logo} alt="Logo" width={24} height={24} />
      <Link href="/login">Login</Link>
    </div>
    <header className="py-16 border-b border-gray-700">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Learn Payload CMS</h1>
          <p className="text-lg mb-6 text-gray-400">
            Build modern applications with our Payload CMS course.
          </p>
          <Link href={"/signup"} className="px-6 py-2 border border-white hover:bg-white hover:text-black transition">
            Get Started
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-gray-700 rounded hover:bg-gray-800 transition">
              <h3 className="text-xl font-bold mb-2">Practical Learning</h3>
              <p className="text-gray-400">
                Work on real-world projects and build hands-on experience.
              </p>
            </div>
            <div className="p-6 border border-gray-700 rounded hover:bg-gray-800 transition">
              <h3 className="text-xl font-bold mb-2">Modern Techniques</h3>
              <p className="text-gray-400">
                Stay ahead with up-to-date content and best practices.
              </p>
            </div>
            <div className="p-6 border border-gray-700 rounded hover:bg-gray-800 transition">
              <h3 className="text-xl font-bold mb-2">Community Support</h3>
              <p className="text-gray-400">
                Join a network of developers sharing tips and resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="py-16 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Dive In?</h2>
          <p className="text-gray-400 mb-6">
            Take the first step towards mastering Payload CMS today.
          </p>
          <Link href={"/signup"} className="px-6 py-2 border border-white hover:bg-white hover:text-black transition">
            Enroll Now
          </Link>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="py-8 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500">&copy; 2025 10x Media GmbH. All rights reserved.</p>
        </div>
      </footer>
  </div>
}