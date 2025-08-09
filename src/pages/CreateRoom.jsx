import React, { useState } from 'react';
import { Theme, Button, Text } from "@radix-ui/themes";
import { useNavigate } from 'react-router-dom';

function CreateRoom() {
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const API_URL = "http://localhost:5001";
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim()) {
            setError('Lütfen bir kullanıcı adı girin.');
            return;
        }

        setLoading(true);
        try {


            const res = await fetch(`${API_URL}/create-room`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.message || 'Sunucudan beklenmeyen bir yanıt alındı.');
                setLoading(false);
                return;
            }

            localStorage.setItem('username', username);
            navigate(`/rooms/${data.room.id}`); // kendi route'unuza göre uyarlayın
        } catch (err) {
            console.error(err);
            setError('Sunucuya bağlanırken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Theme align="center" className="grid content-start">
                <form onSubmit={handleSubmit} className="mt-20 text-center">
                    <Text as="label" size="4">Adınızı Girin:</Text>
                    <div className="w-md mt-3">
                        <input value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder='username'
                            className='border border-sky-500 rounded px-3 py-2 w-64' />
                    </div>
                    {error && <Text as="div" color="red" className='mt-3'>{error}</Text>}
                    <div className="m-5">
                        <Button type="submit" color="cyan" disabled={loading}>
                            {loading ? 'Oluşturuluyor...' : 'Oda Oluştur'}
                        </Button>
                    </div>
                </form>
            </Theme>
        </>
    );
}
export default CreateRoom;