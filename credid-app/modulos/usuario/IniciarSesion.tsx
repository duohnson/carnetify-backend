import { View, Text, Pressable } from 'react-native';
import { estilos } from '../../src/styles/styles';
import { StatusBar } from 'expo-status-bar';

export default function IniciarSesion() {
  return (
    <View style={estilos.areaSegura}>
      <StatusBar style="dark" />
      <View style={estilos.burbujaSuperiorFondo} />
      <View style={estilos.burbujaInferiorFondo} />

      <View style={estilos.contenedor}>
        <View style={estilos.titulos}>
          <Text style={estilos.textoTitulos}>Iniciar Sesión</Text>
        </View>
      </View>

    </View>
  );
}

