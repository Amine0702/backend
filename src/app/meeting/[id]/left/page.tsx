import Link from "next/link";
import Navbar from "../../components/Navbar";

interface PageProps {
  params: { id: string };
}

export default function Page({ params: { id } }: PageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="flex flex-col items-center gap-3 p-6">
        <p className="font-bold text-gray-900 dark:text-gray-100">
          Vous avez quitté cette réunion.
        </p>
        <Link
          href={`/meeting/${id}`}
          className="flex items-center rounded bg-blue-500 px-3 py-2 text-white hover:bg-blue-600"
        >
          Rejoindre à nouveau
        </Link>
      </div>
    </div>
  );
}
