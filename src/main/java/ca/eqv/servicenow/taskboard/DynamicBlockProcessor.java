package ca.eqv.servicenow.taskboard;

import org.w3c.dom.Comment;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.FileReader;
import java.io.IOException;

public class DynamicBlockProcessor {

	public static void main(String[] args) throws ParserConfigurationException, IOException, SAXException, TransformerException {
		final DocumentBuilderFactory documentBuilderFactory = DocumentBuilderFactory.newInstance();
		final DocumentBuilder documentBuilder = documentBuilderFactory.newDocumentBuilder();
		final Document document = documentBuilder.parse("src/main/glide/taskboard.xml");

		final String evaluatejs = readTextFile("src/main/glide/evaluate.js");

		setTextContents(document.getElementsByTagName("g:evaluate"), "evaluate", evaluatejs);

		// These must be double encoded to survive two passes through Jelly
		final String evaluate2js = xmlEscape(readTextFile("src/main/glide/evaluate2.js"));
		final String css = xmlEscape(readTextFile("src/main/glide/style.css"));

		setTextContents(document.getElementsByTagName("g2:evaluate"), "evaluate2", evaluate2js);
		setTextContents(document.getElementsByTagName("style"), "style", css);

		final Comment comment = document.createComment("\n\n*** THIS IS A GENERATED FILE. Do not edit. ***\n\n");
		document.insertBefore(comment, document.getFirstChild());

		final TransformerFactory transformerFactory = TransformerFactory.newInstance();
		final Transformer transformer = transformerFactory.newTransformer();
		final DOMSource documentSource = new DOMSource(document);
		final StreamResult streamResult = new StreamResult("target/taskboard.xml");
		transformer.transform(documentSource, streamResult);
	}

	/** Minimal XML entity escaping for two-phase content */
	public static String xmlEscape(String input) {
		final StringBuilder stringBuilder = new StringBuilder();

		for (char c : input.toCharArray()) {
			switch (c) {
				case '<':
					stringBuilder.append("&lt;");
					break;
				case '>':
					stringBuilder.append("&gt;");
					break;
				case '&':
					stringBuilder.append("&amp;");
					break;
				default:
					stringBuilder.append(c);
					break;
			}
		}
		return stringBuilder.toString();
	}

	public static String readTextFile(String path) throws IOException {
		final StringBuilder stringBuilder = new StringBuilder();
		final FileReader fileReader = new FileReader(path);

		int readBytes = 0;
		char[] buffer = new char[1024];
		while ((readBytes = fileReader.read(buffer)) > 0) {
			stringBuilder.append(buffer, 0, readBytes);
		}

		return stringBuilder.toString();
	}

	public static void setTextContents(final NodeList candidateNodes, final String id, final String textContents) {
		for (int ix = 0; ix < candidateNodes.getLength(); ix++) {
			Node node = candidateNodes.item(ix);
			if (node.getAttributes().getNamedItem("id") != null && id.equals(node.getAttributes().getNamedItem("id").getNodeValue())) {
				node.setTextContent(textContents);
				node.getAttributes().removeNamedItem("id");
			}
		}
	}
}
