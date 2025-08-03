import { Theme, TextField, Button, Text } from "@radix-ui/themes";
import { Link } from "react-router-dom";
function CreateRoom() {
    return (
        <>
            <Theme align="center" className="grid content-start">
                <Text as="label" className="mt-20" size="4">Adınızı Girin:</Text>
                <div className="w-md">
                <TextField.Root className="w-1/5" size="3" variant="surface" placeholder="username" />
                </div>
                <Link to="/rooms" className="m-5">
                    <Button color="cyan">Oda Oluştur</Button>
                </Link>
            </Theme>
        </>
    );
}
export default CreateRoom;