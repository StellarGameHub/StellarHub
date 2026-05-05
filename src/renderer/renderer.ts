document.getElementById('btn-steam')?.addEventListener('click', async () => {
  // Mock: simulamos llamada al backend
  const lista = document.getElementById('juegos-lista');
  if (lista) {
    lista.innerHTML = '<li>Counter-Strike 2 (mock)</li><li>Hades (mock)</li>';
  }
});