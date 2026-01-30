<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Skeleton Render Test</title>
  <link rel="stylesheet" href="/src/ui/layout/layout.css" />
</head>
<body>

<script type="module">
  import { renderLayoutBase } from '/src/ui/layout/layout.render.js';
  import { renderHeader } from '/src/ui/header/header.render.js';

  renderLayoutBase();
  renderHeader();
</script>

</body>
</html>

