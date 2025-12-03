import Purchases from "@/components/profile/Purchases";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MyMovies() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <Card className="bg-[#111216] border-zinc-800">
        <CardHeader>
          <CardTitle>Мои фильмы</CardTitle>
        </CardHeader>
        <CardContent>
          <Purchases />
        </CardContent>
      </Card>
    </div>
  );
}
