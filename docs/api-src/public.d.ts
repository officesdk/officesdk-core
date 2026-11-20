/**
 * Accepts an opaque working-content envelope.
 * A directory path, cache path, or revision field is rejected before the page can store it.
 */
export declare function acceptControlledContent(input: unknown): ControlledWorkingContent;

declare interface AdminFontCatalogResponse {
    readonly schemaVersion: 'font-catalog-v1';
    readonly catalogVersion: string;
    readonly generatedAt: string;
    readonly fonts: readonly AdminFontFace[];
}

declare type AdminFontFace = FontFaceBase<AdminFontResourceRef>;

/**
 * 管理后台资源引用，在 Writer 可见字段上增加传输地址。
 */
declare interface AdminFontResourceRef extends FontResourceRef {
    /** 后台资源接口、CDN 或对象存储地址。uri 不能作为缓存身份。 */
    readonly uri: string;
}

export declare interface AssetPreparation {
    document: Document;
    baseUrl: string;
    catalog: ResourceCatalog;
    suite: SuiteKind;
    language: string;
    direction: "ltr" | "rtl";
    runtimeScripts: readonly string[];
    sharedLocaleScripts: readonly string[];
    componentScripts?: readonly string[];
    componentStyles?: readonly string[];
    selectLanguage(language: string): void | Promise<void>;
    verifySuiteEntry(): void | Promise<void>;
    signal?: AbortSignal;
    timeoutMs?: number;
}

declare interface BookmarkItem {
    name: string | null;
    kind: string;
    status: string;
}

export declare interface BookmarkListResult {
    status: string;
    items: readonly BookmarkItem[];
    total: number;
}

export declare type ChangesetOrigin = "edit" | "suite-prepare";

export declare class ContentHandoffError extends Error {
    constructor(message: string);
}

export declare interface ControlledWorkingContent {
    documentHandle: string;
    suite: SuiteKind;
    content: unknown;
    /** document and presentation: BOS revision of the page's next changeset, continuing Kit's unsaved log. */
    nextChangeSetRevision?: number;
}

/** 在编辑器所在页面中弹出浏览器文件选择框，也可供宿主单独使用。 */
export declare function createBrowserAttachmentPicker(document: Document): OfflineRawAttachmentPicker;

/** Builds the SDK services on top of the Host page port; Kit applies the rules and checks passwords. */
export declare function createEditRestrictionServices(port: OfflineEditRestrictionPort): OfflineEditRestrictionServices;

/** 创建后先注册变化监听，再启动套件。 */
export declare function createOfflineEditor(options: OfflineEditorOptions): Promise<OfflineEditor>;

export declare function createPageMount(input: unknown): PageMount;

export declare const EDITOR_PACKAGE_STATUS: {
    readonly role: "webview-integration";
    readonly sdk: "writer-sheet-presentation-edit";
    readonly canEdit: true;
    readonly canSave: false;
};

declare interface EditorFontFace {
    /**
     * 字体的名称，用于在用户界面上显示的名称
     */
    name: string;
    /**
     * 字体族
     */
    family: string;
    /**
     * 用于加载字体的 URL
     */
    url?: string;
    /**
     * 是否为受版权保护的字体，如果是在用户界面上会有所标识。
     */
    isCopyrightProtected: boolean;
    /**
     * 字体元数据
     */
    meta: EditorFontMeta;
}

/**
 * 字体元数据
 */
declare interface EditorFontMeta {
    head: {
        unitsPerEm: number;
    };
    hhea: {
        ascender: number;
        descender: number;
        lineGap: number;
    };
    vhea?: {
        ascender: number;
        descender: number;
        lineGap: number;
    };
    os2: {
        usWeightClass?: number;
        usWidthClass?: number;
        italic?: boolean;
        isSymbol?: boolean;
        ulCodePageRange: [number, number];
    };
    /**
     * opentype中没有强制要求必须有en条目，只能确定name下的value的类型是对象
     */
    name: {
        preferredFamily?: Record<string, string>;
        preferredSubfamily?: Record<string, string>;
        fontFamily?: Record<string, string>;
        fontSubfamily?: Record<string, string>;
        fullName?: Record<string, string>;
        postScriptName?: Record<string, string>;
    };
}

/**
 * 字体列表
 */
declare interface EditorFontsList {
    /**
     * 返回解析为字体的列表的 Promise。
     */
    getAll: () => Promise<EditorFontFace[]>;
}

declare interface EditorFontsOptions {
    /**
     * 服务器字体列表，用于获取服务器端配置的字体列表，
     * 并提供可用于字体的加载 URL 和字体元数据。
     */
    list?: EditorFontsList;
    /**
     * 字体列表中隐藏不可用的字体，包含外部传入的以及各套件内置的字体
     * 不可用的定义：非本地已安装且不支持下载
     */
    hideUnavailableFonts?: boolean;
    /**
     * 字体下载监听器注册函数，当字体状态发生变化时调用提供的回调函数。
     * 回调函数暂时没有参数，后续可以根据需要添加参数，例如提供变化的字体信息等。
     * @param listener
     * @returns
     */
    registerFontLoadListener?: (listener: (options: FontLoadListenerOptions) => void) => void;
    /**
     * 下载字体的函数，接受字体族名称和一个可选的配置对象作为参数。
     * 配置对象可以包含以下回调函数：
     * - onProgress: 在下载过程中调用，提供下载进度（0 到 1 之间的数字）。
     * - onComplete: 在下载完成时调用。
     * - onError: 在下载过程中发生错误时调用，提供错误对象。
     * @param fontFamily
     * @param option
     * @returns
     */
    download?: (fontFamily: string, option?: {
        onProgress?: (progress: number) => void;
        onComplete?: () => void;
        onError?: (error: Error) => void;
    }) => void;
}

export declare function exportChart(): never;

declare type FileIntent = "save" | "saveAs" | "export" | "close" | "retry";

/**
 * 证明 fontFile 与 metrics 属于同一字体面和生成上下文。
 */
declare interface FontBindingCertificate {
    /** 必须等于 resources.fontFile.hash。 */
    readonly fontHash: FontContentHash;
    /** 必须等于 resources.metrics.hash。 */
    readonly metricsHash: FontContentHash;
    /** 必须等于 fontFace.faceIndex。 */
    readonly faceIndex: number;
    /** 规范化后的可变字体轴。 */
    readonly variationAxes: readonly (readonly [axis: string, value: number])[];
    /** 生成 metrics 的工具链版本。 */
    readonly generatorVersion: string;
}

/**
 * 字体服务领域类型与 FontService 公共接口。
 * 产品宿主创建 FontService 实例；本模块只定义契约。
 */
declare type FontContentHash = `sha256:${string}`;

declare type FontCoverageFormat = 'writer-font-coverage-v1';

declare interface FontFaceBase<ResourceRefT extends FontResourceRef> {
    /** 跨 catalog version 稳定的字体面身份。 */
    readonly fontId: string;
    /** canonical family。候选解析和 alias 去重以它为准。 */
    readonly family: string;
    /** 不产生新的字体面身份，只用于名称匹配。 */
    readonly aliases?: readonly string[];
    /** 只用于 UI 展示。 */
    readonly displayNames?: Readonly<Record<string, string>>;
    /** 当前 Writer 支持的排版兼容 profile。 */
    readonly layoutProfile: FontLayoutProfile;
    readonly fontFace: {
        readonly weight: number;
        readonly style: FontFaceStyle;
        /** 是否为符号字体，由字体元数据确定；省略表示未知。 */
        readonly isSymbol?: boolean;
        readonly stretchPercent: number;
        /** TTC/OTC 字体集合中的面索引；单面字体通常为 0。 */
        readonly faceIndex: number;
        /** 可变字体轴；省略表示字体默认值。 */
        readonly variationAxes?: Readonly<Record<string, number>>;
        readonly typographicFamily?: string;
        readonly typographicSubfamily?: string;
        readonly postScriptName?: string;
        readonly fullName?: string;
    };
    readonly resources: {
        readonly fontFile: ResourceRefT;
        readonly metrics: ResourceRefT;
        readonly coverage: ResourceRefT;
        readonly math?: ResourceRefT;
    };
    readonly binding: FontBindingCertificate;
    readonly meta?: FontFaceMeta;
}

declare interface FontFaceMeta {
    /** 是否受商业授权控制。 */
    readonly commercial?: boolean;
    /** 是否允许出现在字体选择菜单。 */
    readonly selectable?: boolean;
    /** 是否只能作为 fallback，不作为用户可选主字体。 */
    readonly fallbackOnly?: boolean;
    /** 产品或后台的授权记录。 */
    readonly licenseId?: string;
}

declare type FontFaceStyle = 'normal' | 'italic' | 'oblique';

declare interface FontFallbackConfig {
    readonly fallbackFamilies: {
        readonly latin?: readonly string[];
        readonly cjk?: readonly string[];
        readonly complex?: readonly string[];
        readonly emoji?: readonly string[];
        readonly symbol?: readonly string[];
        /** catalog 中受保护的远端终端族。 */
        readonly lastResort: string;
    };
    readonly familyMappings?: readonly FontFamilyMapping[];
    readonly specialFallbackStrategies?: readonly FontSpecialFallbackStrategy[];
}

declare interface FontFamilyMapping {
    readonly requested: readonly string[];
    readonly candidates: readonly string[];
    readonly scriptHints?: readonly FontScriptHint[];
}

declare type FontFileFormat = 'woff' | 'woff2' | 'ttf' | 'otf' | 'ttc' | 'otc';

declare type FontLayoutProfile = 'word-compatible-v1';

/**
 * 字体下载事件类型
 */
declare enum FontLoadEventType {
    DownloadStart = "downloadStart",
    DownloadProgress = "downloadProgress",
    DownloadComplete = "downloadComplete",
    DownloadError = "downloadError"
}

/**
 * 字体下载事件监听器参数，根据事件类型提供不同的属性
 */
declare type FontLoadListenerOptions = {
    type: FontLoadEventType.DownloadStart;
    id: string;
} | {
    type: FontLoadEventType.DownloadComplete;
    id: string;
} | {
    type: FontLoadEventType.DownloadProgress;
    id: string;
    progress: number;
} | {
    type: FontLoadEventType.DownloadError;
    id: string;
    error: Error;
};

declare type FontMathFormat = 'opentype-math-v1';

declare type FontMetricsFormat = 'writer-font-layout-v1';

declare type FontResourceFormat = FontFileFormat | FontMetricsFormat | FontCoverageFormat | FontMathFormat;

/**
 * Writer 可见的资源引用。不含 uri；缓存与完整性以 hash 为准。
 */
declare interface FontResourceRef {
    /** FontService 内部识别资源的稳定身份。 */
    readonly resourceId: string;
    /** 内容身份。 */
    readonly hash: FontContentHash;
    /** 资源编码格式。 */
    readonly format: FontResourceFormat;
    /** 可选字节长度，供宿主做预算和传输保护。 */
    readonly byteLength?: number;
}

declare type FontScriptHint = 'latin' | 'cjk' | 'complex' | 'emoji' | 'symbol';

declare interface FontSpecialFallbackStrategy {
    readonly sources: readonly string[];
    readonly replacements: readonly string[];
    /** 可选预取提示，不决定特殊层准入。 */
    readonly downloadTarget?: string;
}

declare interface GetFontCatalogOptions {
    readonly signal?: AbortSignal;
}

/** 返回本页面包的 release core（深度冻结；与包内 `dist/release.json` 同内容）。 */
export declare function getReleaseInfo(): Readonly<ReleaseCore>;

/** 只交给 Host；返回不代表 Kit 已接纳或保存变化。 */
export declare interface HostBridge {
    forwardChangeset(changeset: OutboundChangeset): void;
}

declare type MaybePromise<T> = T | Promise<T>;

export declare interface OfflineAttachmentPicker {
    open(options: OfflineFilePickerOptions): Promise<OfflinePickedFile[]>;
}

declare interface OfflineContentResources {
    baseUrl: string;
    resolveReadUrl(resourceRef: string): string;
}
export { OfflineContentResources }
export { OfflineContentResources as OfflineWriterContentResources }

export declare interface OfflineEditableAttachment extends OfflineEditorAttachment {
    store?: OfflineMediaStore;
}

export declare type OfflineEditor = OfflineEditorBase & ({
    readonly suite: "document";
    readonly api: {
        readonly writer: OfflineWriterApi;
    };
} | {
    readonly suite: "sheet";
    readonly api: {
        readonly sheet: OfflineSheetApi;
    };
} | {
    readonly suite: "presentation";
    readonly api: {
        readonly presentation: OfflinePresentationApi;
    };
} | {
    readonly suite: "pdf";
    readonly api: {
        readonly pdf: OfflinePdfApi;
    };
});

export declare interface OfflineEditorAttachment {
    picker?: OfflineAttachmentPicker;
    preview?: (resourceRef: string) => void;
}

declare interface OfflineEditorBase {
    state(): OfflineEditorState;
    on(event: "change", listener: (change: OfflineEditorChange) => void): () => void;
    on(event: PageEventName, listener: (state: OfflineEditorState) => void): () => void;
    start(): Promise<void>;
    prepare(): Promise<void>;
    request(input: OfflineEditorRequest): Promise<OfflineEditorState | Exclude<PageMethodResult, PageState>>;
    destroy(): Promise<void>;
}

declare interface OfflineEditorBaseOptions {
    container: HTMLElement;
    suite: "document" | "sheet" | "presentation" | "pdf";
    content: unknown;
    file?: OfflineEditorFile;
    language: string;
    direction: "ltr";
    resources: OfflineEditorResources;
    assets?: OfflineContentResources;
    fontProvider: OfflineFontProvider;
}

export declare type OfflineEditorChange = Omit<OutboundChangeset, "documentHandle" | "suite">;

export declare interface OfflineEditorFile {
    id?: string;
    name?: string;
}

export declare type OfflineEditorOptions = OfflineWriterOptions | OfflineSheetOptions | OfflinePresentationOptions | OfflinePdfOptions;

export declare type OfflineEditorRequest = Omit<PageRequest, "viewId" | "documentHandle" | "instanceId">;

export declare interface OfflineEditorResources {
    baseUrl: string;
    catalog: ResourceCatalog;
    runtimeScripts?: readonly string[];
    sharedLocaleScripts?: readonly string[];
    sharedLocaleNamespaces?: readonly string[];
    signal?: AbortSignal;
    timeoutMs?: number;
}

export declare type OfflineEditorState = Omit<PageState, "viewId" | "documentHandle" | "instanceId">;

declare type OfflineEditRestrictionFailure = {
    readonly kind: "failed";
    readonly code: string;
    readonly retryable: boolean;
};

/** Result kinds of the Writer SDK password-mutation service. */
export declare type OfflineEditRestrictionPasswordResult = {
    readonly kind: "success" | "password-already-set" | "password-not-set" | "password-incorrect" | "result-unknown" | "unavailable" | "aborted";
} | OfflineEditRestrictionFailure;

/** What a Host page exposes for edit restriction (the reference Host's `DemoHost` methods). */
export declare interface OfflineEditRestrictionPort {
    restrictionRules(request: unknown): Promise<OfflineEditRestrictionRulesResult>;
    restrictionPassword(input: {
        action: "set";
        newPassword: string;
    } | {
        action: "change";
        currentPassword: string;
        newPassword: string;
    } | {
        action: "remove";
        currentPassword?: string;
    }): Promise<OfflineEditRestrictionPasswordResult>;
    restrictionVerify(currentPassword: string): Promise<OfflineEditRestrictionVerifyResult>;
}

/** Either service's result. */
export declare type OfflineEditRestrictionResult = OfflineEditRestrictionRulesResult | OfflineEditRestrictionPasswordResult;

/** Result kinds of the Writer SDK rules service. */
export declare type OfflineEditRestrictionRulesResult = {
    readonly kind: "success" | "password-required" | "password-incorrect" | "result-unknown" | "unavailable" | "aborted";
} | OfflineEditRestrictionFailure;

/** The three services the Writer SDK `editRestriction` option takes. */
export declare interface OfflineEditRestrictionServices {
    readonly rules: {
        save(request: unknown, signal: AbortSignal): Promise<OfflineEditRestrictionRulesResult>;
    };
    readonly passwordMutation: {
        setPassword(newPassword: string, signal: AbortSignal): Promise<OfflineEditRestrictionPasswordResult>;
        changePassword(currentPassword: string, newPassword: string, signal: AbortSignal): Promise<OfflineEditRestrictionPasswordResult>;
        removePassword(currentPassword: string | undefined, signal: AbortSignal): Promise<OfflineEditRestrictionPasswordResult>;
    };
    readonly passwordVerification: {
        verify(currentPassword: string, signal: AbortSignal): Promise<OfflineEditRestrictionVerifyResult>;
    };
}

/** Result kinds shared with the Writer SDK password-verification service. */
export declare type OfflineEditRestrictionVerifyResult = {
    readonly kind: "verified" | "incorrect" | "not-set" | "unavailable" | "aborted";
} | {
    readonly kind: "failed";
    readonly code: string;
    readonly retryable: boolean;
};

export declare interface OfflineFilePickerOptions {
    mimeTypes?: string[];
    maxSize?: number;
    extensions?: string[];
    multiple?: boolean;
    directory?: boolean;
    accept?: string;
}

export declare interface OfflineFontProvider {
    getSystemCatalog(options?: GetFontCatalogOptions): Promise<OfflineSystemFontCatalogResult>;
    readResource(resourceId: string, options?: GetFontCatalogOptions): Promise<Uint8Array>;
}

declare interface OfflineLocalPickedFile {
    name: string;
    url: string;
}

declare interface OfflineMediaStore {
    store(input: {
        bucket: "images" | "attachments";
        name: string;
        mime: string;
        file: File;
        signal: AbortSignal;
    }): Promise<{
        resourceRef: string;
    }>;
    cancel(resourceRef: string): Promise<void>;
}
export { OfflineMediaStore }
export { OfflineMediaStore as OfflineWriterMediaStore }

export declare interface OfflinePdfApi {
    /** The page's current PDF bytes, for comparison with the snapshot Kit composed. */
    exportSnapshot(): Promise<ArrayBuffer>;
}

declare interface OfflinePdfBaseOptions extends OfflineEditorBaseOptions {
    suite: "pdf";
    /** Host font package: the editor embeds Noto Sans/Serif SC TrueType faces from it. */
    productFontCatalog?: OfflineWriterProductFontCatalog;
    /** Faces the host licenses for embedding; preferred over productFontCatalog when given. */
    embeddableFonts?: readonly OfflinePdfEmbeddableFont[];
    /** PDF changesets are whole snapshots; there is no revision to continue. */
    nextChangeSetRevision?: never;
    user?: never;
    link?: never;
    help?: never;
    onSdkError?: never;
}

/**
 * A TrueType face the host allows the editor to embed into user PDFs. Redistribution must be licensed,
 * so the host declares these explicitly instead of the editor picking installed fonts.
 */
export declare interface OfflinePdfEmbeddableFont {
    family: string;
    weight: number;
    /** Read through the font provider, like Writer product fonts. */
    resourceId: string;
    hash: `sha256:${string}`;
}

export declare type OfflinePdfOptions = OfflinePdfBaseOptions & ({
    mode: "readonly";
    attachment?: OfflineEditorAttachment & {
        store?: never;
    };
} | {
    mode: "edit";
    attachment: OfflineEditableAttachment & {
        store: OfflineMediaStore;
    };
});

export declare type OfflinePickedFile = OfflineRawPickedFile | OfflineLocalPickedFile;

export declare interface OfflinePresentationApi {
    /** The page's current presentation as BOS MOP JSON, for comparison with Kit's composed content. */
    exportSnapshot(): Promise<string>;
    /** The editor's Office.js-shaped API (`PowerPoint.run`, `Office`, `OfficeExtension`). */
    getJsApi(): OfflinePresentationJsApi;
    /** The editor's history (document state, undo, redo and its events), for rolling AI edits back. */
    editorInternals(): OfflinePresentationEditorInternals;
}

declare interface OfflinePresentationBaseOptions extends OfflineEditorBaseOptions {
    suite: "presentation";
    productFontCatalog?: OfflineWriterProductFontCatalog;
    user?: never;
    link?: never;
    help?: never;
    onSdkError?: never;
}

/** The editor events `editorInternals().on()` accepts. */
export declare type OfflinePresentationEditorEvent = "commit" | "state-change";

/**
 * The editor's history, for rolling an AI edit back through the editor itself. Undo and redo go through the
 * editor's own history, so their changes reach the Host through the `change` event and Kit follows the rollback.
 */
export declare interface OfflinePresentationEditorInternals {
    /** The current document state (undo and redo availability, the model store). */
    getDocument(): OfflinePresentationHistoryState;
    /** Undoes the last step of the editor's history. Refused on a read-only page. */
    undo(): void;
    /** Redoes the last undone step. Refused on a read-only page. */
    redo(): void;
    /**
     * Listens for `commit` (a step entered the history) or `state-change` (the editor state, including undo and redo
     * availability, changed). Returns a function that stops listening; listeners stop when the page is destroyed.
     */
    on(event: OfflinePresentationEditorEvent, listener: () => void): () => void;
}

/** The editor's document state, read live on every access. */
export declare interface OfflinePresentationHistoryState {
    /** The editor's own history has a step to undo. */
    readonly canUndo: boolean;
    /** The editor's own history has a step to redo. */
    readonly canRedo: boolean;
    /**
     * The presentation model store. `encodeBinary()` returns the bytes of the current state: compare two results to
     * tell whether undo has brought the presentation back to an earlier state.
     */
    readonly store: {
        encodeBinary(): Uint8Array;
        readonly canUndo: boolean;
    };
}

/**
 * The editor's Office.js-shaped API, bound to this editor instance.
 *
 * `PowerPoint.run(batch)` runs a batch against the open presentation; the namespaces also carry the documented
 * classes and enums. Changes made through it reach the Host through the editor's `change` event like any other edit.
 * The handle stops working once the editor is unmounted or destroyed.
 */
export declare interface OfflinePresentationJsApi {
    /** Office.js `PowerPoint` namespace bound to this editor: `PowerPoint.run(batch)` and the documented classes and enums. */
    readonly PowerPoint: object;
    /** Office.js `Office` namespace. */
    readonly Office: object;
    /** Office.js `OfficeExtension` namespace (error types, `ClientResult` and the like). */
    readonly OfficeExtension: object;
    /** True once the editor behind this handle has been unmounted or destroyed. */
    isDisposed(): boolean;
}

declare type OfflinePresentationOptions = OfflinePresentationBaseOptions & ({
    mode: "readonly";
    nextChangeSetRevision?: never;
    attachment?: OfflineEditorAttachment & {
        store?: never;
    };
} | {
    mode: "edit";
    /** Kit's `nextChangeSetRevision` for this content; the page's changesets continue from it. */
    nextChangeSetRevision: number;
    attachment?: OfflineEditableAttachment;
});

declare interface OfflineRawAttachmentPicker {
    open(options: OfflineFilePickerOptions): Promise<OfflineRawPickedFile[]>;
}

declare interface OfflineRawPickedFile {
    name: string;
    size: number;
    type: string;
    path?: string;
    raw: File;
}

export declare interface OfflineSheetApi {
    setFocus(isFocus: boolean): Promise<void>;
    readonly workbook: OfflineSheetWorkbook;
    readonly activeSheet: OfflineSheetWorksheet;
    readonly selections: OfflineSheetSelection[] | null;
    readonly activeCell: OfflineSheetCell | null;
    readonly content: {
        getContent(): Promise<unknown>;
        addChangeListener(listener: (change: unknown) => void): () => void;
    };
    readonly text: {
        get(range?: OfflineSheetRangeValue): Partial<{
            bold: boolean;
            italic: boolean;
            underline: boolean;
            strike: boolean;
            color: string;
            highlight: string;
            size: number | string;
            family: string;
        }>;
    };
    readonly eventSubscription: {
        addViewportSizeChangedListener(listener: (size: {
            width: number;
            height: number;
        }) => void): () => void;
        addSaveStatusChangedListener(listener: (status: string) => void): () => void;
        addErrorListener(listener: (error: {
            code: number | string;
            message?: string;
        }) => void): () => void;
        addUrlChangedListener(listener: (params: unknown) => void): () => void;
        addMouseMoveListener(listener: (params: unknown) => void): () => void;
        addHorizontalScrollListener(listener: () => void): () => void;
        addVerticalScrollListener(listener: () => void): () => void;
    };
}

declare interface OfflineSheetBaseOptions extends OfflineEditorBaseOptions {
    suite: "sheet";
    language: "zh-CN";
    /** Sheet interface settings; see OfflineSheetUiOptions. Accepted in read-only and edit mode. */
    ui?: OfflineSheetUiOptions;
    productFontCatalog?: never;
    font?: never;
    link?: never;
    help?: never;
    onSdkError?: never;
}

export declare interface OfflineSheetCell {
    readonly row: number;
    readonly column: number;
    readonly sheetId: string;
    getCellText(): string;
    getCellValue(): OfflineSheetCellValue | null;
    getCellData(): OfflineSheetCellData;
    /** Writes a formula (`=SUM(A1:A3)`) into the cell; `null` clears it. Refused on a read-only page. */
    setCellFormula(formula: string | null, useR1C1?: boolean): void;
}

export declare interface OfflineSheetCellData {
    value: OfflineSheetCellValue | null;
    [key: string]: unknown;
}

export declare type OfflineSheetCellValue = {
    type: "primitive";
    value: string | number | boolean;
} | {
    type: "date";
    value: number;
} | {
    type: "calcError";
    value: {
        error: string;
    };
};

export declare interface OfflineSheetChartFromSelection {
    /** The data range; the current selection when omitted. */
    range?: OfflineSheetRangeValue;
    chart?: {
        title?: string;
        legendVisible?: boolean;
        position?: Partial<OfflineSheetChartPosition>;
    };
    [option: string]: unknown;
}

/** Where `charts.addFromSelection()` puts the chart, in cells and pixel offsets. */
export declare interface OfflineSheetChartPosition {
    row: number;
    column: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    alignToCell?: boolean;
}

/** The charts of one worksheet. */
export declare interface OfflineSheetCharts {
    /** Inserts a chart of the selected (or given) range; resolves with its id and type, or undefined when none was made. */
    addFromSelection(params?: OfflineSheetChartFromSelection): Promise<{
        chartId: string;
        chartType: string;
    } | undefined>;
}

export declare type OfflineSheetFontFace = SheetFontFace;

export declare type OfflineSheetFontMeta = SheetFontMeta;

export declare interface OfflineSheetFonts extends SheetFontsOptions {
    list: {
        getAll(): Promise<OfflineSheetFontFace[]>;
    };
}

export declare type OfflineSheetOptions = OfflineSheetBaseOptions & ({
    mode: "readonly";
    user?: never;
    attachment?: OfflineEditorAttachment & {
        store?: never;
    };
} | {
    mode: "edit";
    user: {
        uid: string;
        name: string;
    };
    attachment?: OfflineEditableAttachment;
});

export declare interface OfflineSheetRange {
    readonly type: "cells" | "rows" | "columns" | "sheet";
    readonly row: number;
    readonly column: number;
    readonly rowCount: number;
    readonly columnCount: number;
    getText(): string;
    getHtml(): string;
    getValue(): (OfflineSheetCellValue | null)[][];
    getData(): OfflineSheetCellData[][];
    /** A1-style address, for example `Sheet1!A1:C3`. */
    readonly address: string;
    /** Writes values row by row from the top left of the range; `null` clears a cell. Refused on a read-only page. */
    setValue(values: (OfflineSheetWritableCellValue | null)[][]): void;
    /** Writes values, formulas or styles cell by cell. Refused on a read-only page. */
    setData(data: OfflineSheetWritableCellData[][]): void;
    /** Makes this range the worksheet's selection. */
    select(): void;
    /** Where the range is drawn, relative to the browser window; null when it is outside the visible area. */
    getBounding(): {
        left: number;
        top: number;
        width: number;
        height: number;
    } | null;
}

export declare type OfflineSheetRangeValue = {
    type: "cells";
    row: number;
    rowCount: number;
    column: number;
    columnCount: number;
} | {
    type: "rows";
    row: number;
    rowCount: number;
} | {
    type: "columns";
    column: number;
    columnCount: number;
} | {
    type: "sheet";
};

export declare interface OfflineSheetSelection {
    getRange(value?: OfflineSheetRangeValue): OfflineSheetRange | null;
    setRange(value: OfflineSheetRangeValue | null): void;
}

/** Sheet's own interface settings a Host may choose. */
export declare interface OfflineSheetUiOptions {
    /**
     * The Sheet toolbar's entry for switching to its previous interface. Offline pages have no account-level interface
     * preference to switch, so Hosts usually pass `{ disabled: true }`; when omitted the editor shows the entry.
     * `feedbackUrl` (http or https) adds a feedback link to the entry; without it there is none.
     */
    versionSwitch?: {
        disabled?: boolean;
        feedbackUrl?: string;
    };
}

export declare interface OfflineSheetWorkbook {
    getWorksheets(): OfflineSheetWorksheet[];
    getWorksheetById(sheetId: string): OfflineSheetWorksheet | null;
    getActiveWorksheet(): OfflineSheetWorksheet;
    setActiveWorksheet(sheetId: string): void;
    /** Adds a worksheet named `name` at `index` (the end without one). Refused on a read-only page. */
    addWorksheet(name?: string, index?: number): void;
}

export declare interface OfflineSheetWorksheet {
    readonly id: string;
    readonly name: string;
    readonly isActive: boolean;
    readonly visible: boolean;
    readonly rowCount: number;
    readonly columnCount: number;
    getSelections(): OfflineSheetSelection[] | null;
    getCell(row: number, column: number): OfflineSheetCell | null;
    getActiveCell(): OfflineSheetCell | null;
    getPhysicalPosition(range: OfflineSheetRangeValue): {
        left: number;
        top: number;
        width: number;
        height: number;
    } | null;
    addRangeListener(listener: (range: {
        sheet: string;
        ranges: OfflineSheetRangeValue[] | null;
    }) => void): () => void;
    setActiveCell(cell: {
        row: number;
        column: number;
    }): void;
    locateCell(row: number, column: number): void;
    search(text: string, range?: OfflineSheetRangeValue | OfflineSheetRangeValue[]): void;
    cancelSearch(): void;
    getViewportSize(): {
        width: number;
        height: number;
    };
    /** The range described by `range`, or null when the worksheet has no such range. */
    getRange(range: OfflineSheetRangeValue): OfflineSheetRange | null;
    /** The range from A1 to the last cell with content, or null for an empty worksheet. */
    getUsedRange(): OfflineSheetRange | null;
    /** The write operations below are refused on a read-only page. */
    rename(name: string): void;
    addRows(index: number, count: number, direction?: "up" | "down"): void;
    addColumns(index: number, count: number, direction?: "left" | "right"): void;
    deleteRows(index: number, count: number): void;
    deleteColumns(index: number, count: number): void;
    setColumnsWidth(columns: {
        column: number;
        width: number;
    }[]): void;
    setFrozenRowCount(count: number): void;
    readonly charts: OfflineSheetCharts;
}

/**
 * One cell for `setData()`: a value, a formula or text, plus style keys the editor understands
 * (`bold`, `italic`, `underline`, `strike`, `color`, `background`, `fontFamily`, `fontSize`, `align`, `vertical`,
 * `wrap`, `format`, borders…). Keys the editor does not know are ignored by it.
 */
export declare interface OfflineSheetWritableCellData {
    value?: string | number | boolean | Date | null;
    formula?: string | null;
    /** With `formula`: keep a leading `=` as text. */
    quotePrefix?: boolean;
    text?: string | null;
    [style: string]: unknown;
}

/** A value `setValue()` writes: anything a cell holds except a calculation error. */
export declare type OfflineSheetWritableCellValue = Exclude<OfflineSheetCellValue, {
    type: "calcError";
}>;

export declare type OfflineSystemFontCatalogResult = {
    status: "available";
    pending: boolean;
    catalog: Omit<AdminFontCatalogResponse, "generatedAt">;
} | {
    status: "unavailable";
    reason: "provider-missing" | "timeout" | "query-failed";
};

export declare interface OfflineWriterApi {
    readonly Word: object;
    readonly Office: object;
    readonly OfficeExtension: object;
    getProfileIdentity(): Readonly<{
        id: string;
        version: string;
    }>;
    isDisposed(): boolean;
    readonly bookmarks: {
        list(query?: {
            limit: number;
        }): Promise<BookmarkListResult>;
    };
    /** The page's current document as BOS MOW JSON, for comparison with Kit's composed content. */
    exportSnapshot(): Promise<string>;
}

export declare type OfflineWriterAttachmentPicker = OfflineAttachmentPicker;

declare interface OfflineWriterBaseOptions extends OfflineEditorBaseOptions {
    suite: "document";
    productFontCatalog?: OfflineWriterProductFontCatalog;
    user?: {
        uid: string;
        name: string;
    };
    /** Edit-restriction services, e.g. `createEditRestrictionServices(host)` over a Kit Host. */
    editRestriction?: OfflineEditRestrictionServices;
    link?: OfflineWriterLinkGenerator;
    fonts?: never;
    help?: {
        helpCenter?: () => void;
        helpConsult?: () => void;
    };
    onSdkError?: (error: OfflineWriterError) => void;
}

export declare interface OfflineWriterError {
    code: string;
    severity: "info" | "warning" | "error" | "fatal";
    retriable: boolean;
    message: string;
    blockedReason?: {
        reasonCode: "writer-collaboration-baseline-unprovable";
        terminal: true;
        documentGeneration: number;
    };
}

export declare type OfflineWriterFilePickerOptions = OfflineFilePickerOptions;

export declare interface OfflineWriterLinkGenerator {
    generate(params: {
        fileGuid: string;
        type: string;
        hash?: string;
        [key: string]: unknown;
    }): Promise<string>;
}

export declare type OfflineWriterOptions = OfflineWriterBaseOptions & ({
    mode: "readonly";
    nextChangeSetRevision?: never;
    attachment?: OfflineEditorAttachment & {
        store?: never;
    };
} | {
    mode: "edit";
    /** Kit's `nextChangeSetRevision` for this content; the page's changesets continue from it. */
    nextChangeSetRevision: number;
    attachment?: OfflineEditableAttachment;
});

export declare type OfflineWriterPickedFile = OfflinePickedFile;

export declare interface OfflineWriterProductFontCatalog extends Omit<AdminFontCatalogResponse, "fonts"> {
    readonly fonts: readonly OfflineWriterProductFontFace[];
    readonly fallback: FontFallbackConfig;
}

export declare type OfflineWriterProductFontFace = AdminFontFace & {
    readonly syntheticBoldAdvance?: "one-design-unit";
};

export declare type OfflineWriterResources = OfflineEditorResources;

/** 页面产生并交给 Host 的变化，以到达顺序交付。 */
export declare interface OutboundChangeset {
    documentHandle: string;
    suite: SuiteKind;
    origin: ChangesetOrigin;
    format: SuiteChange["format"];
    body: string;
    mediaIds?: readonly string[];
}

export declare type PageEventName = "stateChange" | "transferFault" | `${FileIntent}Intent`;

export declare type PageHostConnection = HostBridge;

declare type PageMethod = "state" | "bookmarks.list" | "prepare" | "freeze" | "unfreeze" | "intent" | "destroy";

export declare type PageMethodResult = PageState | BookmarkListResult | null;

/** 页面挂载输入，不创建 Kit 会话或保存工作目录。 */
export declare interface PageMount {
    readonly documentHandle: string;
    readonly suite: SuiteKind;
    readonly content: unknown;
    readonly nextChangeSetRevision?: number;
}

export declare interface PageRequest {
    id: string;
    viewId: string;
    instanceId: number;
    documentHandle: string;
    method: PageMethod;
    params?: unknown;
}

declare type PageStage = "loading" | "ready" | "preparing" | "freezing" | "frozen" | "failed" | "destroyed";

export declare interface PageState {
    viewId: string;
    instanceId: number;
    documentHandle: string;
    suite: SuiteKind;
    stage: PageStage;
    mode: "readonly" | "edit";
    contentReady: boolean;
    transferFault: boolean;
}

export declare type PageStateListener = (state: PageState) => void;

export declare function parseResourceCatalog(input: unknown): ResourceCatalog;

/** 先验证通道数据，再固定目录，防止宿主后续修改当前页面的字体身份。 */
export declare function parseSystemFontCatalog(value: unknown): OfflineSystemFontCatalogResult;

declare type PreparePayloads = readonly SuiteChange[] | Promise<readonly SuiteChange[]>;

export declare type PrepareStep = "endEdit" | "stabilizeFormulaCache" | "flushOnChange";

export declare type PrepareSteps = {
    changeDelivery: "returned";
    endEdit?: () => PreparePayloads;
    stabilizeFormulaCache?: () => PreparePayloads;
    flushOnChange?: () => PreparePayloads;
} | {
    changeDelivery: "callback";
    endEdit?: () => MaybePromise<void>;
    stabilizeFormulaCache?: () => MaybePromise<void>;
    flushOnChange?: () => MaybePromise<void>;
};

/** 按真实异步步骤串行收尾，回调交付与返回值交付只选择一种。 */
export declare function prepareSuite(mount: PageMount, bridge: HostBridge, steps: PrepareSteps): Promise<SuitePrepareResult>;

/** 已求值脚本属于页面全局，不以删除标签伪装回滚；只释放本次持有的样式。 */
export declare function prepareSuiteAssets(input: AssetPreparation): Promise<{
    release(): void;
}>;

/** MOP keeps pictures, video and audio under `media/`; any other attachment original is an embedding. */
export declare function presentationResourceCategory(bucket: "images" | "attachments", mime: string): "media" | "embeddings";

export declare function readWriterManifest(input: unknown): SuiteAssets;

export declare function recordEdit(mount: PageMount, bridge: HostBridge, change: SuiteChange): OutboundChangeset;

/** 发行兼容信息：协议版本、工作根关联表版本、可读的旧关联表版本与降级下限。 */
export declare interface ReleaseCompat {
    readonly protocolVersion: string;
    readonly indexVersion: number;
    readonly readsIndexVersions: readonly number[];
    readonly catalogFormat: number;
    readonly downgradeFloor: string;
}

/** 构建前生成、编进 Kit 二进制与页面包的发行信息（format 1）：版本、渠道、兼容信息与内置编辑器版本。 */
export declare interface ReleaseCore {
    readonly format: 1;
    readonly version: string;
    readonly channel: "stable" | "rc" | "dev";
    readonly compat: ReleaseCompat;
    /** 键为编辑器名（writer、presentation、sheet、pdf）。 */
    readonly editors: Readonly<Record<string, ReleaseEditor>>;
    readonly page: {
        readonly package: string;
        readonly version: string;
    };
}

/** 本发行内置的某个编辑器的版本；开发构建里尚未发版的编辑器为 `null`。 */
export declare interface ReleaseEditor {
    readonly version: string | null;
}

export declare function resolveAssetUrl(base: string, path: string): string;

export declare interface ResourceCatalog {
    format: 1;
    files: Readonly<Record<string, string>>;
    sharedLocales: Readonly<Record<string, {
        path: string;
        namespaces: readonly string[];
    }>>;
    suites: Partial<Record<SuiteKind, SuiteAssets>>;
}

export declare class ResourceError extends Error {
    constructor(message: string, options?: ErrorOptions);
}

declare interface SheetFontFace {
    meta: SheetFontMeta;
    url?: string;
}

declare interface SheetFontMeta {
    name: Pick<EditorFontMeta['name'], 'fontFamily' | 'fullName' | 'fontSubfamily' | 'postScriptName'>;
    os2?: Pick<EditorFontMeta['os2'], 'usWeightClass' | 'italic' | 'isSymbol'>;
}

declare interface SheetFontsOptions extends Omit<EditorFontsOptions, 'list'> {
    list?: { getAll: () => Promise<SheetFontFace[]> };
}

export declare const SUITE_KINDS: readonly ["document", "sheet", "presentation", "pdf"];

export declare interface SuiteAssets {
    root: string;
    scripts: readonly string[];
    styles: {
        ltr: readonly string[];
        rtl: readonly string[];
    };
    locales?: Readonly<Record<string, string>>;
    components?: {
        slots: readonly string[];
        scripts: readonly string[];
        styles: readonly string[];
    };
    /** Global `--ui-*` design tokens the suite's UI kit reads but does not define (Sheet, Presentation). */
    theme?: {
        styles: readonly string[];
    };
}

export declare interface SuiteChange {
    format: "mow-v1" | "mop-v1" | "modoc-v1" | "pdf-snapshot-v1";
    body: string;
    mediaIds?: readonly string[];
}

export declare type SuiteKind = (typeof SUITE_KINDS)[number];

export declare class SuitePrepareError extends Error {
    readonly step: PrepareStep;
    readonly forwarded: readonly OutboundChangeset[];
    constructor(message: string, details: {
        step: PrepareStep;
        forwarded: readonly OutboundChangeset[];
        cause?: unknown;
    });
}

export declare interface SuitePrepareResult {
    forwarded: readonly OutboundChangeset[];
}

export declare class UnsupportedEditorOperation extends Error {
    readonly operation: string;
    constructor(operation: string);
}

export { }
