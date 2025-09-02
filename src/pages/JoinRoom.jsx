import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Theme, Button, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";

export default function JoinRoom() {
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const roomFromUrl = searchParams.get("code") || searchParams.get("");

    if (roomFromUrl) {
      setRoomId(roomFromUrl.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !roomId.trim()) {
      setError("Lütfen kullanıcı adı ve oda numarasını girin.");
      return;
    }

    try {
      const roomRes = await fetch(`${API_URL}/rooms/${roomId}`);
      if (!roomRes.ok) {
        setError("Geçersiz oda numarası.");
        return;
      }

      const userRes = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, rooms_id: roomId }),
      });

      if (userRes.status === 409) {
        setError("Bu kullanıcı adı zaten kullanılıyor.");
        return;
      } else if (!userRes.ok) {
        setError("Kullanıcı kaydında hata oluştu.");
        return;
      }

      navigate(`/rooms/${roomId}`, { state: { username } });
    } catch (err) {
      setError("Sunucuya bağlanılamadı.");
      console.error(err);
    }
  };

  return (
    <Theme >
      <div className="max-w-md mx-auto mt-20 p-6 rounded-lg shadow-lg bg-white h-full" >
        <form onSubmit={handleSubmit} className="space-y-6">
          <Text as="h2" size="6" className="text-center mb-4">
            Odaya Katıl
          </Text>

          {error && (
            <Text
              as="p"
              size="2"
              className="text-red-600 bg-red-100 p-2 rounded text-center"
            >
              {error}
            </Text>
          )}

          <div>
            <Text as="label" size="3" className="block mb-1" htmlFor="username">
              Kullanıcı Adı
            </Text>

            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Kullanıcı adınızı girin"
              className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              maxLength={20}
            />

          </div>

          <div>
            <Text as="label" size="3" className="block mb-1" htmlFor="roomId">
              Oda Numarası
            </Text>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="Oda kodunu girin (4 karakter)"
              className="w-full uppercase px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
              maxLength={4}
            />
          </div>
          <div>
            <Button type="submit" color="cyan" size="3">
              Odaya Katıl
            </Button>
            <Link to="/" className="float-right">
              <Button color="orange" size="3">Ana Sayfa</Button>
            </Link>
          </div>
        </form>
      </div>
    </Theme>
  );
}
