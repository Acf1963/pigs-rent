-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: pwa_agro_analytics
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `dim_animal`
--

DROP TABLE IF EXISTS `dim_animal`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_animal` (
  `sk_animal` int NOT NULL AUTO_INCREMENT,
  `id_brinco_rfid` varchar(50) NOT NULL,
  `sexo` enum('M','F') DEFAULT NULL,
  `linhagem_genetica` varchar(100) DEFAULT NULL,
  `data_nascimento` date DEFAULT NULL,
  PRIMARY KEY (`sk_animal`),
  UNIQUE KEY `id_brinco_rfid` (`id_brinco_rfid`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_animal`
--

LOCK TABLES `dim_animal` WRITE;
/*!40000 ALTER TABLE `dim_animal` DISABLE KEYS */;
INSERT INTO `dim_animal` VALUES (1,'RFID-9001','M','Duroc','2025-12-01'),(2,'RFID-9002','F','Landrace','2025-12-05'),(3,'RFID-9003','M','Pietrain','2025-11-20'),(4,'RFID-9004','F','Duroc','2025-12-10'),(5,'RFID-9005','M','Large White','2025-11-15');
/*!40000 ALTER TABLE `dim_animal` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dim_lote`
--

DROP TABLE IF EXISTS `dim_lote`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_lote` (
  `sk_lote` int NOT NULL AUTO_INCREMENT,
  `codigo_lote` varchar(20) NOT NULL,
  `fornecedor_origem` varchar(100) DEFAULT NULL,
  `data_inicio_lote` date DEFAULT NULL,
  PRIMARY KEY (`sk_lote`),
  UNIQUE KEY `codigo_lote` (`codigo_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_lote`
--

LOCK TABLES `dim_lote` WRITE;
/*!40000 ALTER TABLE `dim_lote` DISABLE KEYS */;
INSERT INTO `dim_lote` VALUES (1,'LOTE-2026-001','Fazenda Quanza','2026-03-01'),(2,'LOTE-2026-002','Agro-Viana','2026-03-15');
/*!40000 ALTER TABLE `dim_lote` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fact_ciclo_vida_suino`
--

DROP TABLE IF EXISTS `fact_ciclo_vida_suino`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fact_ciclo_vida_suino` (
  `sk_producao` int NOT NULL AUTO_INCREMENT,
  `fk_animal` int NOT NULL,
  `fk_lote` int NOT NULL,
  `peso_origem` decimal(10,3) DEFAULT NULL,
  `peso_chegada` decimal(10,3) DEFAULT NULL,
  `peso_vivo_final` decimal(10,3) DEFAULT NULL,
  `peso_carcaca_quente` decimal(10,3) DEFAULT NULL,
  `custo_aquisicao` decimal(12,2) DEFAULT NULL,
  `custo_alimentar_total` decimal(12,2) DEFAULT '0.00',
  `valor_venda_final` decimal(12,2) DEFAULT NULL,
  `data_entrada` date DEFAULT NULL,
  `data_abate` date DEFAULT NULL,
  PRIMARY KEY (`sk_producao`),
  KEY `fk_animal` (`fk_animal`),
  KEY `fk_lote` (`fk_lote`),
  CONSTRAINT `fk_animal` FOREIGN KEY (`fk_animal`) REFERENCES `dim_animal` (`sk_animal`),
  CONSTRAINT `fk_lote` FOREIGN KEY (`fk_lote`) REFERENCES `dim_lote` (`sk_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fact_ciclo_vida_suino`
--

LOCK TABLES `fact_ciclo_vida_suino` WRITE;
/*!40000 ALTER TABLE `fact_ciclo_vida_suino` DISABLE KEYS */;
INSERT INTO `fact_ciclo_vida_suino` VALUES (1,1,1,25.500,24.800,NULL,NULL,45.00,0.00,NULL,'2026-03-01',NULL),(2,2,1,26.200,25.100,NULL,NULL,45.00,0.00,NULL,'2026-03-01',NULL),(3,3,2,28.000,27.200,NULL,NULL,50.00,0.00,NULL,'2026-03-15',NULL);
/*!40000 ALTER TABLE `fact_ciclo_vida_suino` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fato_pesagem`
--

DROP TABLE IF EXISTS `fato_pesagem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fato_pesagem` (
  `sk_pesagem` int NOT NULL AUTO_INCREMENT,
  `fk_animal` int DEFAULT NULL,
  `fk_lote` int DEFAULT NULL,
  `data_pesagem` date NOT NULL,
  `peso_kg` decimal(10,3) NOT NULL,
  `observacao` text,
  PRIMARY KEY (`sk_pesagem`),
  KEY `fk_animal` (`fk_animal`),
  KEY `fk_lote` (`fk_lote`),
  CONSTRAINT `fato_pesagem_ibfk_1` FOREIGN KEY (`fk_animal`) REFERENCES `dim_animal` (`sk_animal`),
  CONSTRAINT `fato_pesagem_ibfk_2` FOREIGN KEY (`fk_lote`) REFERENCES `dim_lote` (`sk_lote`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fato_pesagem`
--

LOCK TABLES `fato_pesagem` WRITE;
/*!40000 ALTER TABLE `fato_pesagem` DISABLE KEYS */;
INSERT INTO `fato_pesagem` VALUES (1,1,1,'2026-03-01',12.500,NULL),(2,1,1,'2026-03-15',18.200,NULL),(3,2,1,'2026-03-01',11.800,NULL),(4,3,2,'2026-03-15',10.500,NULL),(5,1,1,'2026-03-01',12.500,NULL),(6,1,1,'2026-03-15',18.200,NULL),(7,2,1,'2026-03-01',11.800,NULL),(8,3,2,'2026-03-15',10.500,NULL);
/*!40000 ALTER TABLE `fato_pesagem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `log_erros_pesagem`
--

DROP TABLE IF EXISTS `log_erros_pesagem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `log_erros_pesagem` (
  `id_erro` int NOT NULL AUTO_INCREMENT,
  `fk_animal` int DEFAULT NULL,
  `tipo_erro` varchar(100) DEFAULT NULL,
  `valor_lido` decimal(10,3) DEFAULT NULL,
  `data_deteccao` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `resolvido` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_erro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `log_erros_pesagem`
--

LOCK TABLES `log_erros_pesagem` WRITE;
/*!40000 ALTER TABLE `log_erros_pesagem` DISABLE KEYS */;
/*!40000 ALTER TABLE `log_erros_pesagem` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-21 11:52:14
