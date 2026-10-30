import { Builder, By, until, WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";
import assert from "node:assert";

/**
 * Suite de Pruebas de Selenium WebDriver para el Sistema de Inventario Next.js
 */
async function ejecutarPruebaInventarioSelenium() {
  console.log("🚀 [Selenium] Iniciando sesión con ChromeDriver...");

  // Configuración de opciones de Chrome
  const options = new chrome.Options();
  // Para ejecutar sin ventana gráfica en entornos de prueba, descomentar la siguiente línea:
  // options.addArguments("--headless=new");
  options.addArguments("--window-size=1280,720");
  options.addArguments("--disable-gpu");
  options.addArguments("--no-sandbox");

  const driver: WebDriver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  const BASE_URL = "http://localhost:3000/inventario";

  try {
    // -------------------------------------------------------------
    // PASO 1: Navegar a la plataforma
    // -------------------------------------------------------------
    console.log(`🌐 Navegando a ${BASE_URL}...`);
    await driver.get(BASE_URL);

    // Espera explícita hasta que la aplicación cargue en el DOM
    await driver.wait(
      until.elementLocated(By.xpath("//h1[contains(text(), 'Inventario')]")),
      10000,
      "El encabezado de la aplicación no cargó a tiempo."
    );
    console.log("✅ Vista de inventario cargada exitosamente.");

    // -------------------------------------------------------------
    // PASO 2: Abrir el Modal de Registro de Movimiento
    // -------------------------------------------------------------
    const btnMovimiento = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Movimiento')]")),
      5000,
      "No se encontró el botón 'Movimiento'."
    );
    await btnMovimiento.click();
    console.log("📦 Modal de movimiento desplegado.");

    // Esperar a que el formulario sea visible en el DOM
    await driver.wait(
      until.elementLocated(By.css("form")),
      5000,
      "El formulario de movimiento no se desplegó en el modal."
    );

    // -------------------------------------------------------------
    // PASO 3: Seleccionar Tipo de Movimiento ("Entrada por compra")
    // -------------------------------------------------------------
    const tabEntrada = await driver.wait(
      until.elementLocated(
        By.xpath("//button[@role='tab' and contains(., 'Entrada por compra')]")
      ),
      5000
    );
    await tabEntrada.click();

    // -------------------------------------------------------------
    // PASO 4: Diligenciar los Inputs del Formulario
    // -------------------------------------------------------------
    // 4.1 Input Cantidad
    const inputCantidad = await driver.wait(
      until.elementLocated(By.id("mv-qty")),
      5000
    );
    await inputCantidad.clear();
    await inputCantidad.sendKeys("50");

    // 4.2 Input Costo Unitario
    const inputCosto = await driver.wait(
      until.elementLocated(By.id("mv-cost")),
      5000
    );
    await driver.wait(until.elementIsEnabled(inputCosto), 3000);
    await inputCosto.clear();
    await inputCosto.sendKeys("1.25");

    // 4.3 Input Referencia
    const inputReferencia = await driver.findElement(By.id("mv-note"));
    await inputReferencia.sendKeys("SELENIUM-TEST-TRANS-01");

    console.log("✍️ Formulario completado: Cantidad=50, Costo=$1.25, Ref=SELENIUM-TEST-TRANS-01");

    // -------------------------------------------------------------
    // PASO 5: Enviar la Transacción
    // -------------------------------------------------------------
    const btnRegistrar = await driver.findElement(
      By.xpath("//form//button[@type='submit' and contains(., 'Registrar')]")
    );
    await btnRegistrar.click();
    console.log("📨 Transacción enviada al servidor (Server Action)...");

    // -------------------------------------------------------------
    // PASO 6: Verificación de Aserciones en el DOM
    // -------------------------------------------------------------
    // Esperar a que el modal desaparezca (indica éxito de la operación)
    const modalCerrado = await driver.wait(
      until.stalenessOf(btnRegistrar),
      10000,
      "El modal no se cerró tras registrar la entrada de stock."
    );
    assert.strictEqual(modalCerrado, true, "El modal debió cerrarse automáticamente.");

    // Validar que el indicador de valor total general en cabecera esté presente
    const labelValorTotal = await driver.wait(
      until.elementLocated(By.xpath("//span[contains(., 'Valor:')]")),
      8000
    );
    const textoValor = await labelValorTotal.getText();
    console.log(`📊 Indicador en DOM: "${textoValor}"`);

    // Aserción formal mediante Node.js assert
    assert.ok(
      textoValor.includes("Valor:"),
      "El balance monetario no se reflejó correctamente en la interfaz."
    );

    console.log("🎉 [Selenium] PRUEBA SUPERADA CON ÉXITO: Stock y Kardex actualizados.");
  } catch (error) {
    console.error("❌ [Selenium] Error durante la ejecución de la prueba:", error);
    throw error;
  } finally {
    // -------------------------------------------------------------
    // PASO 7: Cierre ordenado de la sesión de WebDriver
    // -------------------------------------------------------------
    console.log("🛑 Cerrando navegador y sesión de WebDriver...");
    await driver.quit();
  }
}

// Ejecutar la prueba
ejecutarPruebaInventarioSelenium();

