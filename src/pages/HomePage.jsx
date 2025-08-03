import { Theme, Button } from "@radix-ui/themes";
import {  Link } from "react-router-dom";
function HomePage() {
    return (
        <div>
            <Theme align="center" gap="3"className="grid content-center">
                <Link to="/create-room" className="m-3">
                    <Button color="orange" size="4">Oda Oluştur</Button>
                </Link>
                <Link to="rooms">
                    <Button color="cyan" gap="3">Odaya Gir</Button>
                </Link>
            </Theme>

        </div>
    );
}
export default HomePage;