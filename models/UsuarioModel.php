<?php
declare(strict_types=1); // Activa el control estricto de tipos en las llamadas de este archivo.

// Encapsula las consultas de usuarios sin generar HTML ni respuestas HTTP.
final class UsuarioModel // Define la clase UsuarioModel.
{ // Comienza el cuerpo de la función, clase o condición.
    private PDO $conexion; // Conserva conexión PDO compartida como propiedad del objeto.

    // Recibe la conexión PDO sin crear otra dentro del modelo.
    public function __construct(PDO $conexion) // Define __construct con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $this->conexion = $conexion; // Conserva el mismo objeto PDO; los métodos no abren otra conexión.
    } // Finaliza este bloque.

    // SELECT usado por api/login.php; recibe correo y devuelve una cuenta o null.
    public function buscarPorEmail(string $email): ?array // Consulta usuarios con PDO y devuelve una cuenta o null a api/login.php.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'SELECT id, nombre, email, password FROM usuarios WHERE email = :email' // Define la consulta SQL y sus marcadores de parámetros.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula el correo como dato y recupera una fila asociativa.
        $consulta->execute(['email' => $email]); // Ejecuta SQL vinculando valores separados de las instrucciones.
        $usuario = $consulta->fetch(PDO::FETCH_ASSOC); // Recupera una fila SQL; este fetch de PDO no envía HTTP.

        // Indica que no existe una cuenta con ese correo.
        if ($usuario === false) { // Indica que no existe una cuenta con ese correo.
            return null; // Devuelve ausencia de resultado al código que llamó.
        } // Finaliza este bloque.

        // Normaliza el identificador antes de devolver la cuenta.
        $usuario['id'] = (int) $usuario['id']; // Guarda usuario['id'] para las siguientes operaciones.
        return $usuario; // Devuelve la cuenta a api/login.php para comprobar password_verify.
    } // Finaliza este bloque.

    // Inserta nombre, correo y hash mediante parámetros SQL.
    public function crear(string $nombre, string $email, string $passwordHash): int // Define crear con sus entradas y el resultado que devuelve.
    { // Comienza el cuerpo de la función, clase o condición.
        $consulta = $this->conexion->prepare( // Prepara la sentencia SQL; los valores se vinculan después con execute.
            'INSERT INTO usuarios (nombre, email, password) VALUES (:nombre, :email, :password)' // Define la inserción SQL sin concatenar datos del usuario.
        ); // Completa la estructura o llamada iniciada arriba.
        // Vincula los datos sin concatenarlos a la sentencia SQL.
        $consulta->execute([ // Ejecuta SQL vinculando valores separados de las instrucciones.
            'nombre' => $nombre, // Incluye el nombre de la cuenta en esta estructura.
            'email' => $email, // Incluye el correo de la cuenta en esta estructura.
            'password' => $passwordHash, // Vincula el hash BCRYPT con la columna usuarios.password.
        ]); // Completa la estructura o llamada iniciada arriba.

        // Devuelve el identificador generado por MySQL.
        return (int) $this->conexion->lastInsertId(); // Devuelve el ID creado a api/registro.php; el hash queda en usuarios.password.
    } // Finaliza este bloque.
} // Finaliza este bloque.
