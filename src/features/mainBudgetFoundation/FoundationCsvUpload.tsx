interface Props {
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function FoundationCsvUpload({ disabled = false, onFile }: Props) {
  return (
    <section className="foundation-upload">
      <div className="foundation-upload-copy">
        <span className="foundation-upload-icon" aria-hidden="true">XLS</span>
        <div>
          <h2>세입·세출예산서 Excel 파일 불러오기</h2>
          <p>세입예산명세서와 세출예산명세서가 포함된 Excel 파일을 올려주세요.</p>
          <small>학교마다 행 수가 달라도 표 제목과 합계 위치를 찾아 자동으로 정리합니다.</small>
        </div>
      </div>
      <label className={`foundation-file-button${disabled ? " disabled" : ""}`}>
        Excel 파일 선택
        <input
          aria-label="세입·세출예산서 Excel 파일 선택"
          accept=".xls,.xlsx,.csv"
          disabled={disabled}
          type="file"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onFile(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </section>
  );
}
