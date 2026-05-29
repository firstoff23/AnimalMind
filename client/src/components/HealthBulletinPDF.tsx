import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366f1",
    borderBottomStyle: "solid",
    paddingBottom: 10,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6366f1",
  },
  subtitle: {
    fontSize: 12,
    color: "#475569",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6366f1",
    backgroundColor: "#f5f3ff",
    padding: 4,
    marginBottom: 10,
    marginTop: 15,
    textTransform: "uppercase",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  gridCol: {
    width: "50%",
    paddingBottom: 6,
    flexDirection: "row",
  },
  label: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    width: "35%",
  },
  value: {
    fontSize: 9,
    color: "#0f172a",
    width: "65%",
  },
  table: {
    width: "auto",
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 15,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
  },
  tableColHeader: {
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderBottomColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    backgroundColor: "#f8fafc",
    padding: 5,
  },
  tableCol: {
    borderStyle: "solid",
    borderColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderRightWidth: 1,
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#475569",
  },
  tableCell: {
    fontSize: 8,
    color: "#0f172a",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    borderTopStyle: "solid",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 7,
    color: "#94a3b8",
  },
});

interface HealthBulletinPDFProps {
  animal: any;
  vaccinations: any[];
  dewormings: any[];
  treatments: any[];
}

export function HealthBulletinPDF({
  animal,
  vaccinations = [],
  dewormings = [],
  treatments = [],
}: HealthBulletinPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>AnimalMind</Text>
          <Text style={styles.subtitle}>Boletim Sanitário Digital</Text>
        </View>

        {/* Animal Details */}
        <Text style={styles.sectionTitle}>Dados do Animal</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{animal.name || "—"}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Espécie:</Text>
            <Text style={styles.value}>
              {animal.species === "cat" || animal.species === "gato" ? "Gato" : "Cão"}
            </Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Raça:</Text>
            <Text style={styles.value}>{animal.breed || "Indefinida"}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Nascimento:</Text>
            <Text style={styles.value}>{animal.dateOfBirth || "—"}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Sexo:</Text>
            <Text style={styles.value}>
              {animal.sex === "male" ? "Macho" : animal.sex === "female" ? "Fêmea" : "Desconhecido"}
            </Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Cor:</Text>
            <Text style={styles.value}>{animal.color || "—"}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Pelagem:</Text>
            <Text style={styles.value}>
              {animal.coat === "short" ? "Curto" : animal.coat === "medium" ? "Médio" : animal.coat === "long" ? "Longo" : "—"}
            </Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Microchip:</Text>
            <Text style={styles.value}>{animal.microchipNumber || "Não registado"}</Text>
          </View>
        </View>

        {/* Vaccines Table */}
        <Text style={styles.sectionTitle}>Vacinação</Text>
        {vaccinations.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#64748b", fontStyle: "italic", marginBottom: 15 }}>
            Nenhum registo de vacinação encontrado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: "25%" }]}>
                <Text style={styles.tableCellHeader}>Vacina</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "15%" }]}>
                <Text style={styles.tableCellHeader}>Data</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "20%" }]}>
                <Text style={styles.tableCellHeader}>Lote</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "20%" }]}>
                <Text style={styles.tableCellHeader}>Veterinário</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "20%" }]}>
                <Text style={styles.tableCellHeader}>Próxima Dose</Text>
              </View>
            </View>
            {vaccinations.map((v, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: "25%" }]}>
                  <Text style={styles.tableCell}>{v.vaccineName || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "15%" }]}>
                  <Text style={styles.tableCell}>{v.dateAdministered || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{v.batchNumber || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{v.veterinarian || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{v.nextDueDate || "—"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Deworming Table */}
        <Text style={styles.sectionTitle}>Desparasitações</Text>
        {dewormings.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#64748b", fontStyle: "italic", marginBottom: 15 }}>
            Nenhum registo de desparasitação encontrado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: "30%" }]}>
                <Text style={styles.tableCellHeader}>Produto</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "20%" }]}>
                <Text style={styles.tableCellHeader}>Tipo</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "15%" }]}>
                <Text style={styles.tableCellHeader}>Dosagem</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "15%" }]}>
                <Text style={styles.tableCellHeader}>Data</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "20%" }]}>
                <Text style={styles.tableCellHeader}>Próxima Dose</Text>
              </View>
            </View>
            {dewormings.map((d, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: "30%" }]}>
                  <Text style={styles.tableCell}>{d.product || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>
                    {d.type === "internal" ? "Interna" : d.type === "external" ? "Externa" : "Ambas"}
                  </Text>
                </View>
                <View style={[styles.tableCol, { width: "15%" }]}>
                  <Text style={styles.tableCell}>{d.dosage || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "15%" }]}>
                  <Text style={styles.tableCell}>{d.dateAdministered || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{d.nextDueDate || "—"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Other Treatments Table */}
        <Text style={styles.sectionTitle}>Outros Tratamentos</Text>
        {treatments.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#64748b", fontStyle: "italic", marginBottom: 15 }}>
            Nenhum registo de outro tratamento encontrado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableColHeader, { width: "40%" }]}>
                <Text style={styles.tableCellHeader}>Tratamento</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "20%" }]}>
                <Text style={styles.tableCellHeader}>Data</Text>
              </View>
              <View style={[styles.tableColHeader, { width: "40%" }]}>
                <Text style={styles.tableCellHeader}>Notas</Text>
              </View>
            </View>
            {treatments.map((t, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: "40%" }]}>
                  <Text style={styles.tableCell}>{t.treatmentName || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "20%" }]}>
                  <Text style={styles.tableCell}>{t.dateAdministered || "—"}</Text>
                </View>
                <View style={[styles.tableCol, { width: "40%" }]}>
                  <Text style={styles.tableCell}>{t.notes || "—"}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Gerado por AnimalMind • animalmind.vercel.app
          </Text>
          <Text style={styles.footerText}>
            Documento digital não substitui o boletim oficial da DGAV.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
