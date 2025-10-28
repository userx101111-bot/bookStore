import React from 'react';
import { Link } from 'react-router-dom';
import './homepage.css';

export default function AboutUs() {
  return (
    <div className="app">

      {/* About Us Section */}
      <div className="about-us">
        <h2>About Us</h2>
        <p>We are a company dedicated to offering high-quality merchandise for all fans of various anime and pop culture items. Our goal is to provide unique and exclusive items that cater to the needs of enthusiasts around the world.</p>
      </div>

      {/* FAQs Section */}
      <div className="faqs">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-item">
          <h3>What products do you sell?</h3>
          <p>We sell a variety of products, including figurines, plushies, desktop items, clothing, and more, all related to your favorite anime and pop culture themes.</p>
        </div>
        <div className="faq-item">
          <h3>How can I track my order?</h3>
          <p>Once your order has shipped, you will receive a tracking number via email that can be used to track your package through the delivery service provider.</p>
        </div>
        <div className="faq-item">
          <h3>Do you offer international shipping?</h3>
          <p>Yes, we offer international shipping to most countries. Please check our shipping policy for more details.</p>
        </div>
        <div className="faq-item">
          <h3>How can I contact customer support?</h3>
          <p>You can reach us via email at support@animeandyou.com or through our contact page on the website. We're happy to assist with any inquiries or issues.</p>
        </div>
      </div>

           
      
          </div>
        );
      };
