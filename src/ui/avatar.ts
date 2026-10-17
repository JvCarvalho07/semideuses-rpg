export function prepareAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Selecione um arquivo de imagem."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("A imagem deve ter no máximo 10 MB."));
      return;
    }

    const source = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const size = 512;
      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(source);
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      URL.revokeObjectURL(source);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Não foi possível abrir a imagem."));
    };
    image.src = source;
  });
}
