interface Props {
  disabled?: boolean;
  onFile: (file: File) => void;
}

export function FoundationCsvUpload({ disabled = false, onFile }: Props) {
  return (
    <section className="foundation-upload">
      <div className="foundation-upload-copy">
        <span className="foundation-upload-icon" aria-hidden="true">CSV</span>
        <div>
          <h2>세입·세출 CSV 파일 불러오기</h2>
          <p>K-에듀파인에서 내려받은 세입·세출 통합 CSV 파일 1개를 선택해 주세요.</p>
          <small>학교마다 행 수가 달라도 표 제목과 합계 위치를 찾아 자동으로 정리합니다.</small>
        </div>
      </div>
      <label className={`foundation-file-button${disabled ? " disabled" : ""}`}>
        CSV 파일 선택
        <input
          aria-label="세입·세출 CSV 파일 선택"
          accept=".csv,text/csv"
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
