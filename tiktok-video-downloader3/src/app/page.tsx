import DownloadForm from "@/components/DownloadForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "TikTok Video Downloader",
  description: "Download TikTok videos easily and safely",
};

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Download Your Favorite Videos
          </h2>
          <p className="text-gray-600 mb-8">
            Paste a TikTok video URL below and click download. Your video will
            be processed and ready to download.
          </p>
        </div>

        <DownloadForm />

        <div className="mt-12 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🚀 Fast & Easy
            </h3>
            <p className="text-gray-600 text-sm">
              Simply paste the TikTok video URL and click download. It's that
              easy!
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              🔒 Safe & Secure
            </h3>
            <p className="text-gray-600 text-sm">
              Your videos are processed securely and never stored on our
              servers.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              📱 Multiple Formats
            </h3>
            <p className="text-gray-600 text-sm">
              Download videos in various qualities and formats to suit your
              needs.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
